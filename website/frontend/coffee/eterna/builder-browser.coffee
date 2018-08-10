class @BuilderBrowser extends Builder
  #Constant variable
  CONST_NAME_IND = 0
  CONST_TITLE_IND = 1
  CONST_SEQ_IND = 2
  CONST_SOLID_IND = 3
  CONST_VOTE_IND = 4
  CONST_M_VOTE_IND = 5
  CONST_BODY_IND = 6
  CONST_ROUND_IND = 7
  CONST_GC_IND = 8
  CONST_UA_IND = 9
  CONST_GU_IND = 10
  CONST_MEL_IND = 11
  CONST_FREE_E_IND = 12
  CONST_SYN_IND = 13
  CONST_SCORE_IND = 14
  CONST_SHAPE_THR_IND = 15
  CONST_SHAPE_V_IND = 0
  CONST_SECSTRUCT_IND = 1
  CONST_ERROR_IND = 2
  iMin = []
  iMax = []
  iIndex = ["3","4","5","7","8","9","10","11","12","14","15"] #the collection of column(need number filtering) index
  
  on_build : (block ,$container, params) ->
    nid = params['nid']
    acoldefs = [[CONST_SYN_IND, 'desc']] #default sorting
    
    #initialize browser settings
    local_settings = null
    if local_settings = @local_get_items()
      for ii in [0..CONST_SHAPE_THR_IND] by 1
        local_settings.aoSearchCols[ii].sSearch = ""
      local_settings['abVisCols'] = [true,true,true,true,true,true,true,true,true,true,true,true,true,true,true,true]
      @local_set_items(local_settings)
    
    PageData.get_synthesized_results(params, (page) =>
      post_params = []
      post_params['nid'] = nid
      post_params['lab_title'] = page['lab_title']
      
      if page['my_votes']? then post_params['my_votes'] = page['my_votes']
      else post_params['my_votes'] = 0
        
      if page['pick_sum']? then post_params['pick_sum'] = page['pick_sum']
      else post_params['pick_sum'] = 0
        
      if page['num_slots']? then post_params['num_slots'] = page['num_slots']
      else post_params['num_slots'] = 0
        
      if page['uid'] == page['founder'] then post_params['is_founder'] = true
      else post_params['is_founder'] = false
            
      ThemeCompiler.compile_block(block,post_params,$container)

      #for designs, need to refactor.. or use css later by lullujune
      window_height = $(window).height()
      table_height = window_height-300

      if page['browse_type'] is "project"
        if $old_ui_button = @get_element("old-ui-button")
          $old_ui_button.hide()
          
      if $("div[name=footer]")? then $("div[name=footer]").detach()
      if $("#pages")? then $("#pages").css("width", "100%")
      if $('body')? then $('body').css('background-image','none')
      
      #to show current vote information
      if $my_votes_panel = @get_element("my-votes-panel")
        window.my_votes_panel = $my_votes_panel
        
      if $pick_sum_panel = @get_element("pick-sum-panel")
        window.pick_sum_panel = $pick_sum_panel

      #load data
      res = page['synthesized_results']['synthesized']
      shape_data = page['synthesized_results']['shape_data']
      window.data = res
      
      #create head
      stitle = ["Designer","Title","Sequence","ID","Vote","My Vote","Description","Round","GC","UA","GU","Melting Point","Free Energy","Synthesized","Score","Shape Threshold"]
      filter = ["text","text","text","number","number","number","text","number","number","number","number","number","number","text","number","number"]
      sclass = ["s_head","m_head","xl_head","s_head","xs_head", "xs_head", "l_head","xs_head","xs_head","xs_head","xs_head","xs_head","xs_head","xs_head","xs_head","xs_head"]

      thead_first_r = "<tr>"
      thead_second_r = "<tr>"
      thead_third_r = "<tr>"
      
      for ii in [0..15] by 1
        thead_first_r += "<th>"+stitle[ii]+"</th>"
        if filter[ii] is "text"
          thead_second_r += "<th id='"+ii+"'><input id='search' class='"+sclass[ii]+"' type='text'></input></th>"
        else
          thead_second_r += "<th id='"+ii+"' class='number_filter'><input id='min'class='number_range_filter' type='text'></input><input id='max' class='number_range_filter' type='text'></input></th>"
        
        if ii is CONST_SEQ_IND and res[0]?
          thead_third_r += "<th id='"+ii+"'>"+EternaUtils.format_sequence_base_number(res[0][CONST_SEQ_IND])+"</th>"
        else
          thead_third_r += "<th></th>"
          
      thead_first_r += "</tr>"
      thead_second_r += "</tr>"
      thead_third_r += "</tr>"
      thead = "<thead>"+thead_first_r+thead_second_r+thead_third_r+"</thead>"

      #create table
      $(document).ready(() ->
        $('#board').html('<table cellpadding="0" cellspacing="0" border="0" class="display pretty" id="_board">'+thead+'</table></div>')
        
        window.synTable = $('#_board').dataTable({
          "aaData": res,
          "sDom":'RC<"clear">tr',
          "bSortCellsTop":true,
          "bStateSave":true,
          "bPaginate":false,
          "aaSorting": acoldefs,
          "iDisplayLength": 50,
          "sScrollX": "100%",
          "sScrollY": table_height,
          "bSortClasses": false,
          "bAutoWidth": true,
          "fnStateSave": (oSettings, oData) ->
            if local_settings?
              if local_settings['rVisCols'] then oData.rVisCols = local_settings['rVisCols']
              else oData.rVisCols = [] 
              
              if local_settings['seqViewOpt'] then oData.seqViewOpt = local_settings['seqViewOpt']
              else oData.seqViewOpt = 1
              
              if local_settings['seqViewBackgroundOpt'] then oData.seqViewBackgroundOpt = local_settings['seqViewBackgroundOpt']
              else oData.seqViewBackgroundOpt = 1
            else
              oData.rVisCols = []
              oData.seqViewOpt = 1
              oData.seqViewBackgroundOpt = 1
            _this.local_set_items(oData)
          "fnStateLoad": (oSettings) ->
            _this.local_get_items()
          "fnCreatedRow":( nRow, aData, iDisplayIndex ) ->
            _this.formatting_table_cells(nRow, aData, shape_data[iDisplayIndex], iDisplayIndex, nid, local_settings)
          "fnRowCallback":( nRow, aData, iDisplayIndex) ->
            $(nRow).click(() ->
              row = window.synTable.fnGetPosition($(this).closest('tr')[0])
              Page.transit("/web/browse/view/"+res[row][CONST_SOLID_IND]+"/?row="+row+"&o_row="+iDisplayIndex+"&current_round="+page["current_round"], true)
            )
          "fnInitComplete":() ->
            _this.set_text_filter()
            _this.set_number_filter()
            
            #make 'keyup' trigger when parameter is passed
            if params['ID'] || params['Title'] || params['Designer'] || params['Synthesized']
              _this.auto_filtering(params, this)
              
            if local_settings? && local_settings['rVisCols'].length > 0
              _this.show_columns(local_settings['rVisCols'], this)
            
            if local_settings? && local_settings.hasOwnProperty('seqViewBackgroundOpt')
              if !parseInt(local_settings['seqViewBackgroundOpt'])
                $(".monospace").css('background-color','transparent')
            
            if $("#overlay")?
              $("#overlay").hide()
              
        })
      )
    )
    
  local_set_items : (oData) ->
    localStorage.setItem('dt-/web/browse/', JSON.stringify(oData))
  local_get_items : () ->
    return JSON.parse(localStorage.getItem('dt-/web/browse/'))
  formatting_table_cells : (nRow, aData, shape, iDisplayIndex, nid, local_settings) ->
    $('td:eq('+CONST_NAME_IND+')', nRow).html(EternaUtils.format_summary(aData[CONST_NAME_IND],25))
    $('td:eq('+CONST_TITLE_IND+')', nRow).html(EternaUtils.format_summary(aData[CONST_TITLE_IND],27))
    $('td:eq('+CONST_BODY_IND+')', nRow).html(EternaUtils.format_summary(aData[CONST_BODY_IND],40))
    sum = 1.0*aData[CONST_GC_IND]+1.0*aData[CONST_UA_IND]+1.0*aData[CONST_GU_IND];
    if sum == 0 then sum = 1
    gc_per = Math.round(aData[CONST_GC_IND]*100.0/sum)
    ua_per = Math.round(aData[CONST_UA_IND]*100.0/sum)
    gu_per = Math.round(aData[CONST_GU_IND]*100.0/sum)
        
    if aData[CONST_SYN_IND] == "Yes"
      $('td:eq('+CONST_VOTE_IND+')', nRow).html('<div class="green-font bold-font">'+aData[CONST_VOTE_IND]+'</div>')
      $('td:eq('+CONST_M_VOTE_IND+')', nRow).html('<div class="green-font bold-font">'+aData[CONST_M_VOTE_IND]+'</div>')
      $('td:eq('+CONST_SYN_IND+')', nRow).html('<div class="green-font bold-font">'+aData[CONST_SYN_IND]+'</div>')
      $('td:eq('+CONST_SHAPE_THR_IND+')', nRow).html('<div class="green-font bold-font">'+aData[CONST_SHAPE_THR_IND]+'</div>')
    else
      if page['current_round'] != parseInt(aData[CONST_ROUND_IND])
        $('td:eq('+CONST_VOTE_IND+')', nRow).html('<div class="gray-font bold-font">'+aData[CONST_VOTE_IND]+'</div>')
        $('td:eq('+CONST_M_VOTE_IND+')', nRow).html('<div class="gray-font bold-font">'+aData[CONST_M_VOTE_IND]+'</div>')
        $('td:eq('+CONST_SYN_IND+')', nRow).html('<div class="gray-font bold-font">'+aData[CONST_SYN_IND]+'</div>')
        $('td:eq('+CONST_SHAPE_THR_IND+')', nRow).html('<div class="gray-font bold-font">'+aData[CONST_SHAPE_THR_IND]+'</div>')
    $('td:eq('+CONST_GC_IND+')', nRow).html(aData[CONST_GC_IND]+ ' ('+gc_per+'%)')
    $('td:eq('+CONST_UA_IND+')', nRow).html(aData[CONST_UA_IND]+ ' ('+ua_per+'%)')
    $('td:eq('+CONST_GU_IND+')', nRow).html(aData[CONST_GU_IND]+ ' ('+gu_per+'%)')
    $('td:eq('+CONST_MEL_IND+')', nRow).html(aData[CONST_MEL_IND]+" &deg;C")
    $('td:eq('+CONST_FREE_E_IND+')', nRow).html(aData[CONST_FREE_E_IND]+' kcal')
    
    if aData[CONST_SYN_IND] != "FAILED"
      $('td:eq('+CONST_SCORE_IND+')', nRow).html(aData[CONST_SCORE_IND]+' / 100')
      
    if local_settings?
      seqViewOpt = parseInt(local_settings.seqViewOpt)
    else
      seqViewOpt = 1
      
    $('td:eq('+CONST_SEQ_IND+')', nRow).html(@render_seq_color(seqViewOpt, nid, aData[CONST_SEQ_IND], shape[CONST_SHAPE_V_IND], aData[CONST_SHAPE_THR_IND], shape[CONST_SECSTRUCT_IND],shape[CONST_ERROR_IND]))
    
  render_seq_color : (seqViewOpt, nid, data, shape_value, shape_thr, shape_secstruct, shape_error) ->
    if seqViewOpt is 0
      cont_head = '<div id="seq-base-color">'
      cont_body = EternaUtils.format_sequence_base_color(data)
    else
      cont_head = '<div id="seq-exp-data">'
      if seqViewOpt is 1 #continuous shape
        if nid >= 2284109
          cont_body = EternaUtils.format_sequence_exp_data_absolute(data,shape_value,shape_thr,shape_secstruct,true)  
        else
          cont_body = EternaUtils.format_sequence_exp_data_legacy(data,shape_value,shape_thr,shape_secstruct,true)
      else if seqViewOpt is 2 #discrete shape
        if nid >= 2284109
          cont_body = EternaUtils.format_sequence_exp_data_absolute(data,shape_value,shape_thr,shape_secstruct,false)
        else
          cont_body = EternaUtils.format_sequence_exp_data_legacy(data,shape_value,shape_thr,shape_secstruct,false)
      else if seqViewOpt is 3 # shape with error
        cont_body = EternaUtils.format_sequence_exp_data_absolute_error(data,shape_value,shape_thr,shape_secstruct,true,shape_error)
      else # base and shape as background
        cont_body = EternaUtils.format_sequence_exp_data_cont_bg(data,shape_value,shape_thr,shape_secstruct)
        
    cont_end = "</div>"
    cont = cont_head+cont_body+cont_end
    return cont
    
  set_text_filter : () ->
    $("thead input#search").keyup(() ->
      index = $(this).closest('th').index() ##attr('id')
      if window.synTable?
        window.synTable.fnFilter( this.value, synTable.oApi._fnVisibleToColumnIndex(window.synTable.fnSettings(), index))
    )   
    $("thead input#search").each((i) ->
      this.initVal = this.value
    )
    $("thead input#search").focus(() ->
      className = this.className
      if(className.indexOf("search_init") != -1)
        this.className = className.replace(" search_init",'')
        this.value = ""
    )
    $("thead input#search").blur((i) ->
      if (this.value == "")
        this.className += " search_init"
        this.value = this.initVal
    )
  set_number_filter : () ->
    $('thead input#min').keyup(()->
      index = $(this).closest('th').attr('id')
      iMin[index] = this.value
      if window.synTable?
        window.synTable.fnDraw()
    )
    $('thead input#max').keyup(()->
      index = $(this).closest('th').attr('id')
      iMax[index] = this.value
      if window.synTable?
        window.synTable.fnDraw()
    )
    
  auto_filtering : (params, tb) ->
    if params['Title']?
      if input = $('th#'+CONST_TITLE_IND).find('input[type=text]')
        input.val(params['Title'])
        tb.fnFilter( params['Title'], $('th#'+CONST_TITLE_IND).index())
          
    if params['Designer']?
      if input = $('thead th#'+CONST_NAME_IND).find('input[type=text]')
        input.val(params['Designer'])
        tb.fnFilter(params['Designer'], $('th#'+CONST_NAME_IND).index())
          
    if params['Synthesized']?
      if input = $('thead th#'+CONST_SYN_IND).find('input[type=text]')
        input.val(params['Synthesized'])
        tb.fnFilter(params['Synthesized'], $('th#'+CONST_SYN_IND).index())
          
    if params['ID']?
      if input = $('thead th#'+CONST_SOLID_IND).find('input[id=min]')
        input.val(params['ID'])
      if input = $('thead th#'+CONST_SOLID_IND).find('input[id=max]')
        input.val(params['ID'])
      tb.fnFilter(params['ID'], $('th#'+CONST_SOLID_IND).index())
          
  show_columns : (rColVis, tb) ->
    for ii in [0..rColVis.length-1]
      if !rColVis[ii]
        tb.fnSetColumnVis(ii,0)
        
  $.fn.dataTableExt.afnFiltering.push (oSettings, aData, iDataIndex) ->
    if (iMin.length == 0 && iMax.length == 0)
      return true
    f = true
    for ii in [0..iIndex.length-1] by 1
      key_ = iIndex[ii]
      if iMin[key_]? then min = iMin[key_] else min = ""
      if iMax[key_]? then max = iMax[key_] else max = ""
      key_ = $('#'+iIndex[ii]).index()
      data = aData[key_]*1.0
      if min is "" and max is ""
        f *= true
      else if min is "" and data <= max*1
        f *= true
      else if min*1 <= data and max is ""
        f *= true
      else if min <= data and data <= max
        f *= true
      else
        f *= false
    return f
    
class @BuilderAdvancedSeqSearch extends Builder
  
  on_build: (block, $container, params) ->
    ThemeCompiler.compile_block(block, params, $container)
    
    if $advanced_seq_search_button = @get_element("advanced-seq-search-button")
      $advanced_seq_search_button.click(() =>
        if index = $("th#2").index()
          index = parseInt(index)
        else
          return
                    
        #varification
        if $type_1 = @get_element("type-1")
          type_1 = $type_1.val().toUpperCase()
          if !(type_1 is "A" or type_1 is"C" or type_1 is "G" or type_1 is "U" or type_1 is "")
            alert "Please enter correct Base (A,G,C,T)"
        
        if $type_2 = @get_element("type-2")
          type_2 = $type_2.val().toUpperCase()
          if !(type_2 is "A" or type_2 is "C" or type_2 is "G" or type_2 is "U" or type_2 is "")
            alert "Please enter correct Base (A,G,C,T)"
            
        if $loc_1 = @get_element("loc-1") then loc_1 = parseInt($loc_1.val())
        if $loc_2 = @get_element("loc-2") then loc_2 = parseInt($loc_2.val())
  
        reg = "^"
        if loc_1
          for ii in [1..loc_1-1] by 1
            reg += "."
          
          reg += type_1
        
        if loc_2
          for ii in [loc_1+1..loc_2] by 1
            reg += "."
            
          reg += type_2
        
        window.synTable.fnFilter(reg, index, true, true)
        
        #display  
        if input = $('thead th#2').find('input[type=text]')
          input.val(reg)
        
        #why overlay...isn't working....
        if $overlay_ = $('div[name=advanced-seq-search]')
          $overlay_.parent().hide()
        
        if $overlay_under_ = $('#overlay-under')
          $overlay_under_.hide()
      )
    
class @BuilderSeqViewOptions extends Builder
  
  on_build: (block, $container, params) ->
    nid = params['nid']    
    ThemeCompiler.compile_block(block, params, $container)
    
    local_settings = @local_get_items('dt-/web/browse/')
            
    if $seq_view_options_button = @get_element("seq-view-options-button")
      $seq_view_options_button.click(() =>
        
        if val = $('input:radio[name=sequence-view-option-buttons]:checked').val()
          local_settings['seqViewOpt'] = val
          
        if val = $('input:radio[name=bg-coloring-option-buttons]:checked').val() 
          local_settings['seqViewBackgroundOpt'] = val
           
        @local_set_items('dt-/web/browse/', local_settings)
        url = "/web/browse/"+nid+"/"
        Utils.redirect_to(url)
      )
    
  local_get_items : (key) ->
    return JSON.parse(localStorage.getItem(key))
  local_set_items : (key, settings) ->
    localStorage.setItem(key, JSON.stringify(settings))    

class @BuilderColumnOptions extends Builder
  
  on_build: (block, $container, params) ->
    nid = params['nid']
    lab_title = params['lab_title']
    total_num_columns = 15
    ThemeCompiler.compile_block(block, params, $container)
    
    $("li").live("click",() ->
        if $(this).hasClass("selected")
          $(this).removeClass("selected")
        else
          $(this).addClass("selected")
      )
      
    $(".col-sort-opt").live("click", () ->
      sort_opt = ['none', 'asc', 'desc']
      curr_opt = $(this).text()
      if curr_opt is "none"
        this.innerHTML = "asc"
      else if curr_opt is "asc"
        this.innerHTML = "desc"
      else
        this.innerHTML = "none"
      )
      
    if displayed_info = @get_element("displayed-info")
      displayed_info.sortable()
      displayed_info.disableSelection()

    if type_of_displayed_info = @get_element("types-of-displayed-info")
      type_of_displayed_info.sortable()
      type_of_displayed_info.disableSelection()

    if settings = @local_get_items("dt-/web/browse/")
      col_orders = settings['ColReorder']
      ab_col_vis = settings['rVisCols']
      col_sort = settings['aaSorting']
      for ii in [0..total_num_columns] by 1
        if ab_col_vis.length is 0 or ab_col_vis[ii]
          if $selected_column = @get_element("col-opt-"+col_orders[ii])
             if $displayed_info = @get_element("displayed-info")
               $selected_column.appendTo($displayed_info)
      
      for ii in [0..col_sort.length-1] by 1
        ind = col_sort[ii][0]
        sort_opt = col_sort[ii][1]
        if $selected_column_sort = @get_element("col-sort-opt-"+ind)
          $selected_column_sort.html(sort_opt)
              
    if $remove_col_arrow = @get_element("remove-col-arrow")
      $remove_col_arrow.click(() =>
        if $displayed_info = @get_element("displayed-info")
          if li = $displayed_info.find(".selected")
            if $types_of_displayed_info = @get_element("types-of-displayed-info")
              for ii in [0..li.length-1] by 1
                $(li[ii]).appendTo($types_of_displayed_info)
                $(li[ii]).removeClass("selected")
        )
    
    if $add_col_arrow = @get_element("add-col-arrow")
      $add_col_arrow.click(() =>
        if $types_of_displayed_info = @get_element("types-of-displayed-info")
          if li = $types_of_displayed_info.find(".selected")
            if $displayed_info = @get_element("displayed-info")
              for ii in [0..li.length-1] by 1
                $(li[ii]).appendTo($displayed_info)
                $(li[ii]).removeClass("selected")
      )
          
    if $set_columns = @get_element("cols-set-button")
      $set_columns.click(() =>
        #initialize
        col_orders = []
        ab_col_vis = []
        col_sort = []
        total_col_num = 15
        col_orders_index = 0
        
        for ii in [0..total_col_num] by 1
          col_orders.push null
          ab_col_vis.push false
          
        if $displayed_info = @get_element("displayed-info")
          if li = $displayed_info.find("li")
            for col_orders_index in [0..li.length-1] by 1
              ind = parseInt(li[col_orders_index].id.split("-")[2])
              col_orders[col_orders_index] = ind
              ab_col_vis[col_orders_index] = true
              if $sort_opt = @get_element("col-sort-opt-"+ind)
                opt = $sort_opt.text()
                if opt != "none"
                  col_sort.push [ind,opt]
                  
        if $types_of_displayed_info = @get_element("types-of-displayed-info")
          if li = $types_of_displayed_info.find("li")
            for ii in [0..li.length-1] by 1
              ind = parseInt(li[ii].id.split("-")[2])
              col_orders[col_orders_index] = ind
              col_orders_index += 1
        
        if settings = @local_get_items("dt-/web/browse/")
          settings['ColReorder'] = col_orders
          settings['rVisCols'] = ab_col_vis
          settings['aaSorting'] = col_sort
          @local_set_items("dt-/web/browse/", settings)
          
        url = "/web/browse/"+nid+"/"
        Utils.redirect_to(url)
      )
      
  local_get_items : (key) ->
    return JSON.parse(localStorage.getItem(key))
  local_set_items : (key, settings) ->
    localStorage.setItem(key, JSON.stringify(settings))
    
class @BuilderViewResult extends Builder

  on_build : (block, $container, params) ->
    solid = params['solid']
    current_round = params['current_round']
    n_row = parseInt(params['row'])
    o_row = parseInt(params['o_row'])
    
    PageData.get_solution_info(solid, current_round, (page) =>
      @my_vote = 0
      @my_votes = 0
      @votes = 0
      pick = 0
            
      solution = page['solution']
      if page['my_vote']?
        @my_vote = parseInt(page['my_vote'], 10)
      
      if page['my_votes']?
        @my_votes = parseInt(page['my_votes'], 10)
      
      if page['votes']?
        @votes = parseInt(page['votes'], 10)
      
      if page['pick']?
        pick = parseInt(page['pick'], 10)
      
      input_params = {}
      input_params['title'] = solution['title']
      input_params['nid'] = solid
      input_params['puznid'] = solution['puznid']
      input_params['thumbnail'] = EternaUtils.get_puzzle_middle_thumbnail(solution['puznid'])
      input_params['name'] = solution['name']
      input_params['uid'] = solution['nid']
      input_params['is_active'] = solution['is_active']
      
      if params['is_on_overlay']
        input_params['is_not_on_overlay'] = false
      else
        input_params['is_not_on_overlay'] = true
      
      #if ( solution['single_shape_value']? or solution['switch_shape_value']? ) and page['pick']?
      if (solution['single_shape_value']? or solution['switch_shape_value']?) and (solution['exp_phase'] != 2)
        input_params['synthesized'] = true
      else
        input_params['synthesized'] = false
      
      if solution['single_shape_value']?
        tmp_single = solution['single_shape_value'].toString()
        
      if solution['switch_shape_value']?
        tmp_switch = solution['switch_shape_value'].toString()
        
      if (tmp_single == "FAILED") or (tmp_switch == "FAILED")
        input_params['is_failed_synthesize'] = true
      else
        input_params['is_failed_synthesize'] = false
                
      if current_round is solution['submitted_round']
        input_params['is_curr_round'] = true
      else
        input_params['is_curr_round'] = false
        
      #page['uid'] = "10"
      if page['uid'] == page['founder']
        input_params['is_founder'] = true
      else
        input_params['is_founder'] = false
        
      if solution['selection_method'] != "user_vote"
        input_params['selected_by_admin'] = true
      else
        input_params['selected_by_admin'] = false
        
      if (solution['puznid'] == "4736266" || solution['puznid'] == "4736267" || solution['puznid'] == "4736268" || solution['puznid'] == "4736271" || solution['puznid'] == "4736272" || solution['puznid'] == "4736273") && solution['score'] > 0
        input_params['additional_results_url'] = "https://s3.amazonaws.com/eterna/labs/4736274/figures/"+solid+".png"

      if (solution['puznid'] == "5448661" || solution['puznid'] == "5448662" || solution['puznid'] == "5448663" || solution['puznid'] == "5448664" || solution['puznid'] == "5448671" || solution['puznid'] == "5448677" || solution['puznid'] == "5489436" || solution['puznid'] == "5489437" || solution['puznid'] == "5489438") && solution['score'] > 0
        input_params['additional_results_url'] = "https://s3.amazonaws.com/eterna/labs/histograms/"+solid+".png"

      if (solution['puznid'] == "5736147" || solution['puznid'] == "5736148" || solution['puznid'] == "5736149" || solution['puznid'] == "5736154" || solution['puznid'] == "5807490" || solution['puznid'] == "5807493" || solution['puznid'] == "5807497" || solution['puznid'] == "5736163" || solution['puznid'] == "5736176" || solution['puznid'] == "5750136" || solution['puznid'] == "5761605" || solution['puznid'] == "5750152" || solution['puznid'] == "5750155") && solution['score'] > 0
        input_params['additional_results_url'] = "https://s3.amazonaws.com/eterna/labs/histograms_R95/"+solid+".png"

      if (solution['puznid'] == "5851774" || solution['puznid'] == "5851780" || solution['puznid'] == "5851784" || solution['puznid'] == "5851785" || solution['puznid'] == "5851787" || solution['puznid'] == "5851791" || solution['puznid'] == "5832249") && solution['score'] > 0
        input_params['additional_results_url'] = "https://s3.amazonaws.com/eterna/labs/histograms_R96/"+solid+".png"

      if (solution['puznid'] == "5962961" || solution['puznid'] == "5962962" || solution['puznid'] == "5962963" || solution['puznid'] == "5962964" || solution['puznid'] == "5962965" || solution['puznid'] == "5962966" || solution['puznid'] == "5962967" || solution['puznid'] == "5963103") && solution['score'] > 0
        input_params['additional_results_url'] = "https://s3.amazonaws.com/eterna/labs/histograms_R97/"+solid+".png"

      if (solution['puznid'] == "6089618" || solution['puznid'] == "6089619" || solution['puznid'] == "6089620" || solution['puznid'] == "6089621" || solution['puznid'] == "6089622" || solution['puznid'] == "6089623") && solution['score'] > 0
        input_params['additional_results_url'] = "https://s3.amazonaws.com/eterna/labs/histograms_R98/"+solid+".png"

      if (solution['puznid'] == "6089811" || solution['puznid'] == "6099461") && solution['score'] > 0
        input_params['additional_results_url'] = "https://s3.amazonaws.com/eterna/labs/histograms_R98_coop3/"+solid+".png"

      if (solution['puznid'] == "3644662" || solution['puznid'] == "4575362" || solution['puznid'] == "6645687" || solution['puznid'] == "6645688" || solution['puznid'] == "6645689" || solution['puznid'] == "6645690" || solution['puznid'] == "6645691" || solution['puznid'] == "6645692" || solution['puznid'] == "6645693" || solution['puznid'] == "6645694" || solution['puznid'] == "6645695" || solution['puznid'] == "6645696") && solution['score'] > 0
        input_params['additional_results_url'] = "https://s3.amazonaws.com/eterna/labs/histograms_R103/"+solid+".png"


      input_params['body'] = solution['body']
      input_params['score'] = solution['score']
      input_params['comments'] = page['comments']
      input_params['solution_url'] = "http://eterna.cmu.edu/web/browse/"+solution['puznid']+"/?ID="+solid
      input_params['player_url'] = "http://eterna.cmu.edu/web/browse/"+solution['puznid']+"/?Designer="+solution['name']
      ThemeCompiler.compile_block(block, input_params,$container)
      
      if !params['is_on_overlay']
        if $prev_solution = @get_element("prev-solution")
          $prev_solution.hide()
        if $next_solution = @get_element("next-solution")
          $next_solution.hide()
          
      #$("body").keydown((event) ->
      #  if $container.is(":not(:hidden)")
      #    if event.keyCode == KeyCode.KEYCODE_UP_ARROW
      #      _this.move_next_solution(o_row, nid, current_round)
      #    if event.keyCode == KeyCode.KEYCODE_DOWN_ARROW
      #      _this.move_prev_solution(o_row, nid, current_round)
      #)
      
      if $prev_solution = @get_element("prev-solution")
        $prev_solution.click(()->
          #snd = new Audio("https://dl.dropboxusercontent.com/u/42333087/ting.mp3")
          #snd.play()
          _this.move_prev_solution(o_row, current_round)
        )
        
      if $next_solution = @get_element("next-solution")
        $next_solution.click(()->
          #snd = new Audio("https://dl.dropboxusercontent.com/u/42333087/ting.mp3")
          #snd.play()
          _this.move_next_solution(o_row, current_round)
        )
        
      if $secstructures = @get_element("secstructures")
        if solution['switch_structs']?
          switch_structs = solution['switch_structs']
          for jj in [0..switch_structs.length-1] by 1
            $secstructures.append('<div id="switch-'+jj+'"></div>')
            if $switch = @get_element("switch-"+jj)
              $switch.append('<div style="padding:15px;">Target '+jj+'</div>')
              $switch.append('<div id="switch-base-'+jj+'" class="browser-secstruct-base"></div>')
              $switch.append('<div id="switch-shape-'+jj+'" class="browser-secstruct-shape"></div>')
              if $switch_base = @get_element("switch-base-"+jj)
                EternaUtils.draw_secstructure(switch_structs[jj], $switch_base, solution['sequence'], null, null )
                
              if $switch_shape = @get_element("switch-shape-"+jj)
                if solution['switch_shape_value']?
                  switch_shape_value = solution['switch_shape_value']
                  shape_value = []
                  shape_value.push(switch_shape_value[jj]['start_index'])
                  tmp = switch_shape_value[jj]['peaks']
                  for ii in [0..tmp.length-1] by 1
                    shape_value.push(tmp[ii])
                  shape_threshold = switch_shape_value[jj]['threshold']
                  EternaUtils.draw_secstructure(switch_structs[jj], $switch_shape, null, shape_value, shape_threshold)
                else
                  EternaUtils.draw_secstructure(switch_structs[jj], $switch_shape, null, null, null)
                  
              $switch.height($switch_shape.height()+50)
          $secstructures.height($switch.height()*jj)
        else
          $secstructures.append('<div id="single-base" class="browser-secstruct-base"></div>')
          $secstructures.append('<div id="single-shape" class="browser-secstruct-shape"></div>')
          if $single_base = @get_element("single-base")
            EternaUtils.draw_secstructure(solution['secstruct'], $single_base, solution['sequence'], null, null )
            
          if $single_shape = @get_element("single-shape")
            EternaUtils.draw_secstructure(solution['secstruct'], $single_shape, null, solution['single_shape_value'], solution['shape_threshold'])
            
          $secstructures.height($single_shape.height()+45)
          
      if solution['selection_method'] != "user_vote"
        @hide_all_vote()
        @hide_all_pick()
        #if @pick is 1
        #  @show_unpick()
        #else
        #  @show_pick()
      else
        @hide_all_pick()      
        if @my_vote is 1
          @show_unvote()
        else
          @show_vote()
                  
      if $get_design_url = @get_element("get-design-url")
        $get_design_url.click (() =>
          alert input_params['solution_url']
        )
        
      if $get_player_design_url = @get_element("get-player-design-url")
        $get_player_design_url.click (() =>
          alert input_params['player_url']
        )
        
      #if $see_result_button = @get_element("see-result")
      #  $see_result_button.click (() =>
      #    location = "/game/solution/"+solution['puznid']+"/"+solid+"/seeresult/"
      #    Utils.redirect_to(location)
      #  )
        
      #if $view_and_copy_button = @get_element("view-and-copy")
      #  $view_and_copy_button.click(() ->
      #    location = "/game/solution/"+solution['puznid']+"/"+solid+"/copyandview/"
      #    Utils.redirect_to(location)
      #  )
        
      if $vote = @get_element("vote")
        $vote.click(() =>
          @show_loading("vote")
          
          query_params = {type:"vote", puznid:input_params['puznid'], solnid:input_params['nid']}
          url = Application.POST_URI
          
          AjaxManager.query("POST", url, query_params, (response) =>
            EternaUtils.process_response(response, (data) =>
              if data['success']
                @show_unvote()
                @votes = @votes+1
                @my_votes = @my_votes+1
                if !(input_params['is_not_on_overlay'])
                  window.my_votes_panel.html(@my_votes+'&nbsp;')
                  vote_col_ind = $('thead th#4').index()
                  my_vote_col_ind = $('thead th#5').index()
                  
                  if my_vote_col_ind != -1
                    window.synTable.fnUpdate(1, n_row, my_vote_col_ind)
                  if vote_col_ind != -1
                    window.synTable.fnUpdate(@votes, n_row, vote_col_ind)
                    
              else
                alert data['error']
                @show_vote()
            )
            @hide_loading()
          )
        )
        
      if $unvote = @get_element("unvote")
        $unvote.click(() =>
          @show_loading("unvote")
          query_params = {type:"unvote", puznid:input_params['puznid'], solnid:input_params['nid']}
          url = Application.POST_URI
          
          AjaxManager.query("POST", url, query_params, (response) =>
            EternaUtils.process_response(response, (data) =>
              if data['success']
                @show_vote()
                @votes = @votes-1
                @my_votes = @my_votes-1
                if !(input_params['is_not_on_overlay'])
                  window.my_votes_panel.html(@my_votes+'&nbsp;')
                  vote_col_ind = $('thead th#4').index()
                  my_vote_col_ind = $('thead th#5').index()
                  
                  if vote_col_ind != -1
                    window.synTable.fnUpdate(@votes, n_row, vote_col_ind)
                  if my_vote_col_ind != -1
                    window.synTable.fnUpdate(0, n_row, my_vote_col_ind)
                    
              else
                alert data['error']
                @show_unvote()
            )
            @hide_loading()
          )
        )
        
      if $pick = @get_element("pick")
        $pick.click(() =>
          @show_pick_loading("pick")
          query_params = {type:"pick", puznid:input_params.puznid, solnid:input_params.nid}
          url = Application.POST_URI
          AjaxManager.query("POST", url, query_params, (response) =>
            EternaUtils.process_response(response, (data) =>
              if data['success']
                @show_unpick()
                if data.pick_sum
                  pick_sum = data.pick_sum
                else 
                  pick_sum = 0
                
                if !(input_params.is_not_on_overlay)
                  window.pick_sum_panel.html(pick_sum+"&nbsp;")
              else
                alert data['error']
                @show_pick()
              )
            @hide_pick_loading()
            )
          )
          
      if $unpick = @get_element("unpick")
        $unpick.click(() =>
          @show_pick_loading("unpick")
          query_params = {type:"unpick", puznid:input_params.puznid, solnid:input_params.nid}
          url = Application.POST_URI
          
          AjaxManager.query("POST", url, query_params, (response) =>
            EternaUtils.process_response(response, (data) =>
              if data.success
                @show_pick()
                if data.pick_sum?
                  pick_sum = data.pick_sum
                else
                  pick_sum = 0
                
                if !(input_params.is_not_on_overlay)
                  window.pick_sum_panel.html(pick_sum+'&nbsp;')
              else
                alert data['error']
                @show_unpick()
              )
            @hide_pick_loading()
            )
          )
      )
  show_vote : () ->
    if $vote = @get_element("vote")
      $vote.show()
    if $unvote = @get_element("unvote")
      $unvote.hide()
  show_unvote : () ->
    if $vote = @get_element("vote")
      $vote.hide()
    if $unvote = @get_element("unvote")
      $unvote.show()
  hide_loading : () ->
    if $vote_loading = @get_element("vote-loading")
      $vote_loading.hide()
  show_loading : ( vote_type ) ->
    if $vote_loading = @get_element("vote-loading")
      $vote_loading.show()
    if vote_type is "vote"
      if $vote = @get_element("vote")
        $vote.hide()
    else 
      if $unvote = @get_element("unvote")
        $unvote.hide()
  hide_all_vote : ()->
    if $vote = @get_element("vote")
      $vote.hide()
    if $unvote = @get_element("unvote")
      $unvote.hide()
  show_pick : () ->
    if $pick = @get_element("pick")
      $pick.show()
    if $unpick = @get_element("unpick")
      $unpick.hide()
  show_unpick : () ->
    if $pick = @get_element("pick")
      $pick.hide()
    if $unpick = @get_element("unpick")
      $unpick.show()
  hide_pick_loading : () ->
    if $pick_loading = @get_element("pick-loading")
      $pick_loading.hide()
  show_pick_loading : ( pick_type ) ->
    if $pick_loading = @get_element("pick-loading")
      $pick_loading.show()
    if pick_type is "pick"
      if $pick = @get_element("pick")
        $pick.hide()
    else
      if $unpick = @get_element("unpick")
        $unpick.hide()
  hide_all_pick : () ->
    if $pick = @get_element("pick")
      $pick.hide()
    if $unpick = @get_element("unpick")
      $unpick.hide()
      
  move_prev_solution : (o_row, current_round) ->
    if o_row?
      $curr = $('tbody tr:eq('+o_row+')', window.synTable)
      if $curr && o_row > 0
        $prev = $curr.prev()
        prev_row = window.synTable.fnGetPosition($prev.closest('tr')[0])
        #prev_sol_data = window.synTable.fnGetData(prev_row)
        #solid_ind = $('thead th#3').index()
        SOLID_INDEX = 3
        Page.transit("/web/browse/view/"+window.data[prev_row][SOLID_INDEX]+"/?row="+prev_row+"&o_row="+(o_row-1)+"&current_round="+current_round, true)
      else
        alert "Could not get a previous solution"
  move_next_solution : (o_row, current_round) ->
    if o_row?
      $curr = $('tbody tr:eq('+o_row+')', window.synTable)
      total_cnt = parseInt(window.synTable.fnSettings().fnRecordsTotal())
      if $curr && total_cnt-1 >= o_row
        $next = $curr.next()
        next_row = window.synTable.fnGetPosition($next.closest('tr')[0])
        #next_sol_data = window.synTable.fnGetData(next_row)
        #solid_ind = $('thead th#3').index()
        SOLID_INDEX = 3
        Page.transit("/web/browse/view/"+window.data[next_row][SOLID_INDEX]+"/?row="+next_row+"&o_row="+(o_row+1)+"&current_round="+current_round, true)
      else
        alert "Could not get a next solution"
           
class @BuilderRNALayoutTest extends Builder

  on_build : (block, $container, params) ->
    @layout = null
    @thumbnail_line = null
    @thumbnail_dot = null
    @secstruct = ".....((((((......((((((((((....)))))))((((.((((....)))).))))(((((((....)))))))))).....))))))...................."
    @secstruct = "...(((((........(((.(((.(((...)))((....))(((((...)))))(((((...)))))((....))(((...))).))).)))..(((..(((...))).((((...)))).(((...)))..)))....)))))((((...)))).((((((.((((...)))).(((...))).(((((...))))).(((...))).((((...)))).)))))).((((...))))(((((....(((..(((...))).(((...))).(((...)))..)))..(((.(((.(((...)))((....))(((((...)))))(((((...)))))((....))(((...))).))).)))........)))))..."
    @sequence = null

    @pair_space = null
    @primary_space = null
    @line_width = 1
    
    params['secstruct'] = @secstruct
    params['seq'] = @sequence
    ThemeCompiler.compile_block(block,params,$container)
    
    if $rnalayout_canvas = @get_element("rnalayout-canvas")
      @layout = EternaUtils.draw_secstructure( @secstruct, $rnalayout_canvas, @sequence, null, null, null, null, @primary_space, @pair_space, @line_width)
    
    if $rnalayout_thumbnail_line = @get_element("rnalayout-thumbnail-div")
      @thumbnail_line = EternaUtils.draw_secstructure( @secstruct, $rnalayout_thumbnail_line, @sequence, null, null, true, true, @primary_space, @pair_space, @line_width)
    
    if $rnalayout_thumbnail_dot = @get_element("rnalayout-thumbnail-dot")
      @thumbnail_dot = EternaUtils.draw_secstructure( @secstruct, $rnalayout_thumbnail_dot, @sequence, null, null, true, false, @primary_space, @pair_space, @line_width)
      
    if $change_structure = @get_element("change-structure")
      $change_structure.click(() =>
        if $c_structure = @get_element("c_structure")
          tmp = $c_structure.val()
          #if $rnalayout_canvas = @get_element("rnalayout-canvas")
          #  if @layout.change_structure_to( tmp )
          #    @secstruct = tmp
          #    if $curr_struct = @get_element("curr-struct")
          #      $curr_struct.html(@secstruct)
          #  else
          #    alert 'Secstructure might be wrong. Pleas input correct one again!'
          if $rnalayout_thumbnail_line = @get_element("rnalayout-thumbnail-div")
            @secstruct = tmp
            @thumbnail_line = EternaUtils.draw_secstructure(@secstruct, $rnalayout_thumbnail_line, @sequence, null, null, true, true, @primary_space, @pair_space, @line_width)
            if $curr_struct = @get_element("curr-struct")
              $curr_struct.html(@secstruct)
      )
    
    if $change_sequence = @get_element("change-sequence")
      $change_sequence.click(() =>
        if $c_sequence = @get_element("c_sequence")
          tmp = $c_sequence.val()
          if $rnalayout_canvas = @get_element("rnalayout-canvas")
            if @layout.change_sequence_to(tmp)
              @sequence = tmp
              if $curr_seq = @get_element("curr-seq")
                $curr_seq.html(@sequence)
            else
              alert "The length of sequence must be matched with the length of current secstructure. Please input correct one again!"
      )
    
    if $change_pair_space = @get_element("change-pair-space")
      $change_pair_space.click(() =>
        if $c_pair = @get_element("c_pair")
          tmp = $c_pair.val()
          if tmp != ""
            if $rnalayout_thumbnail_line = @get_element("rnalayout-thumbnail-div")
              @pair_space = parseInt(tmp)
              @thumbnail_line = EternaUtils.draw_secstructure(@secstruct, $rnalayout_thumbnail_line, @sequence, null, null, true, true, @primary_space, @pair_space, @line_width)
      )
      
    if $change_primary_space = @get_element("change-primary-space")
      $change_primary_space.click(() =>
        if $c_primary = @get_element("c_primary")
          tmp = $c_primary.val()
          if tmp != ""
            if $rnalayout_thumbnail_line = @get_element("rnalayout-thumbnail-div")
              @primary_space = parseInt(tmp)
              @thumbnail_line = EternaUtils.draw_secstructure(@secstruct, $rnalayout_thumbnail_line, @sequence, null, null, true, true, @primary_space, @pair_space, @line_width)
      )
      
    if $change_line_width = @get_element("change-line-width")
      $change_line_width.click(() =>
        if $c_line_width = @get_element("c_line_width")
          tmp = $c_line_width.val()
          if tmp != ""
            if $rnalayout_thumbnail_line = @get_element("rnalayout-thumbnail-div")
              @line_width = parseInt(tmp)
              @thumbnail_line = EternaUtils.draw_secstructure(@secstruct, $rnalayout_thumbnail_line, @sequence, null, null, true, true, @primary_space, @pair_space, @line_width)
      )

class @BuilderLabTracker extends Builder
 
  on_build : (block, $container, params) ->
    ThemeCompiler.compile_block(block,params,$container)
            
    PageData.get_labs_for_tracker(params, (page) =>
      labs = page['labs']
      
      if $tracked_labs = @get_element("tracked-labs")
        packer = Packers($tracked_labs)
        packer.add(labs)
      
      for ii in [0..labs.length-1] by 1
        if $status = @get_element("#{labs[ii]['nid']}_status")
          $status.val(labs[ii]['exp_phase'])
        if $date = @get_element("#{labs[ii]['nid']}_date")
          $date.datepicker()
          if labs[ii]['exp_phase_end']?
            date = new Date(labs[ii]['exp_phase_end']*1000).toUTCString()
            $date.val(date)
            
      if $submit_exp_phase = @get_element("submit-exp-phase")
        $submit_exp_phase.click(() =>
          Overlay.set_loading("replying...")
          Overlay.show()
          if $waiting_labs_profile = @get_element("waiting_labs_profile")
            $waiting_labs_profile.submit()
          Overlay.hide()
        )
    )
    
