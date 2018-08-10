@EternaUtils = {

  format_body : (str) -> 
    if !str
      return ""
     
    str = Utils.strip_html(str, ["script"]);
    return Utils.newline_to_br(str);
    
  format_summary : (str, len) ->
    if !str
      return ""
    
    str = str.replace(/\n\r/g, "");    
    str = Utils.remove_html(str)
    if str.length > len
      str = str.substring(0,len) + ".."
    return str
    
  format_comment_mentions : (str) ->
    if !str
      return ""
    uname = Application.CURRENT_USER['name']
    if !(uname?)
      return str
    s = "<span class='interactive-mention-me'>@" + uname + "</span>"
    str = str.replace(/(@[A-Za-z0-9_]+)/, ($mention) ->
      if $mention.indexOf(uname) >= 0
        $mention = s
      return $mention
    )
    return str

  get_pager : (current_page, total_pages, pageindex_to_url) ->

    if(total_pages < 1)
      return ""
    
    str = ""
    chunk = 10;
    big_index = Math.floor(current_page / chunk)
    
    str += "<a href='" + pageindex_to_url(0) + "'>&lsaquo;&lsaquo;</a> &nbsp;&nbsp;"
    
    if big_index > 0
      str += "<a href='" + pageindex_to_url(((big_index) * chunk - 1)) + "'>&lsaquo;</a> &nbsp;&nbsp;"
    
    for ii in [big_index * chunk..Math.min((big_index+1) * chunk, total_pages)-1] by 1
      if ii == current_page
        str += "<strong>" + (ii+1) + "</strong> &nbsp;&nbsp;";
      else
        str += "<a href='" + pageindex_to_url(ii) + "'>" + (ii+1) + "</a> &nbsp;&nbsp;"
    
    if total_pages > (big_index+1) * chunk
      str += "<a href='" + pageindex_to_url(((big_index+1) * chunk)) + "'>&rsaquo;</a> &nbsp;&nbsp;"
    
    str += "<a href='" + pageindex_to_url(total_pages-1) + "'>&rsaquo;&rsaquo;</a>"
    
    return str;

  
  process_response : (response, success_cb, fail_cb) ->
    if !(response?)
      if fail_cb?
        fail_cb()
        return
    
    if response['error']?
      Utils.display_error(response['error'])
      return
    
    if !(response['data']?)
      if fail_cb?
        fail_cb()
        return
    
    if new_achievements = response['new_achievements']
      achievements = []
      for own key, val of new_achievements
        achievements.push(val)
      
      block = Blocks("overlay-achievements")
      $overlay_slot = Overlay.get_slot("achievements")
      Overlay.load_overlay_content("achievements")
      Overlay.show()  
      block.add_block($overlay_slot, {achievements:achievements})    
    
    if success_cb?
      success_cb(response['data'])
      
  get_user_picture : (uri) ->
    if uri? && !Utils.is_text_empty(uri)
      if (/^http/i).exec(uri)
        return uri
      return "/" + uri
    else
      return Application.DEFAULT_USER_PICTURE
  
  get_puzzle_middle_thumbnail : (nid) ->
    #return "/sites/default/files/puzzle_mid_thumbnails/thumbnail" + nid + ".png"
    return "https://s3.amazonaws.com/eterna/puzzle_mid_thumbnails/thumbnail" + nid + ".png"
  
  get_puzzle_cloud_thumbnail : (nid) ->
    return "https://s3.amazonaws.com/eterna/puzzle_cloud_thumbnails/thumbnail" + nid + ".png"

  format_sequence_base_number : (str) ->
    if !str
      return ""
    
    r_str = ""
    
    left = 16*4
    
    for ii in [0..str.length-1] by 1
      if !((ii+1)%5)
        r_str += "<span class='monospace' style='position:relative; left:"+left+"px; font-family:arial;color:#000000;'>"+(ii+1)+"</span>"
        if ii < 99
          left += 16*4
        else
          left += 16*4-8
          
    return r_str

  format_sequence_base_color : (str) ->
    if !str
      return ""
      
    str = str.toUpperCase()
    r_str = ""
    
    for ii in [0..str.length-1] by 1
      if !((ii-4)%5)
        fifth_base = " line-per-five-base"
      else
        fifth_base = ""
        
      ch = str.charAt(ii)
      if ch is "G"
        r_str += "<span class='monospace"+fifth_base+"' style='font-family:arial;color:#FF3333;'>G</span>"
      if ch is "C"
        r_str += "<span class='monospace"+fifth_base+"' style='font-family:arial;color:#33FF33;'>C</span>"
      if ch is "A"
        r_str += "<span class='monospace"+fifth_base+"' style='font-family:arial;color:#FFFF33;'>A</span>"
      if ch is "U" 
        r_str += "<span class='monospace"+fifth_base+"' style='font-family:arial;color:#7777FF;'>U</span>"
        
    return r_str

  format_sequence_exp_data_absolute : (seq, shape_value, shape_threshold, struct, continuous) ->
    if !seq
      return ""
    r_seq = ""
    
    jj = 1
    if shape_value?
      min = 0
      max = 1
      shape_value = @transform(shape_value, min, max)
                    
    for ii in [0..seq.length-1] by 1
      if !((ii-4)%5) 
        fifth_base=" line-per-five-base" 
      else 
        fifth_base=""
        
      ch = seq.charAt(ii)
      sec = struct.charAt(ii)
      
      if sec is "(" or sec is ")"
        bg_color = 'rgba(0,0,102,0.5)'
      else
        bg_color = 'rgba(255,255,0,0.5)'
        
      r_seq += '<span class="monospace'+fifth_base+'" style="font-family:arial;background-color:'+bg_color+';color:'
              
      if shape_value is null or shape_value[0] == "FAILED"
        r_seq += 'grey;">'
      else
        if parseInt(shape_value[0],10)-1 > ii || ii >= shape_value.length + parseInt(shape_value[0],10)-1   
          r_seq += 'grey;">'
        else
          v = parseFloat(shape_value[jj]) 
          t = 0.5
          if continuous
            if v < t 
              r_seq += @find_color_by_level(@find_level(min,max,t,v))
              r_seq += ';'
            else if v == t
              r_seq += '#FFFFFF;'
            else
              r_seq += @find_color_by_level(@find_level(min,max,t,v))
              r_seq += ';'
          else
            if v <= t 
              r_seq += '#2222FF;'
            else
              r_seq += '#FFFF00;'
          
          r_seq += '" title="location:'+ii+' shape value:'+v+'">'
          jj += 1
      r_seq += ch+'</span>'
      
    return r_seq

  format_sequence_exp_data_absolute_error : (seq, shape_value, shape_threshold, struct, continuous, shape_error) ->
    if !seq
      return ""
    r_seq = ""
    
    jj = 1
    if shape_value?
      min = 0
      max = 1
      shape_value = @transform(shape_value, min, max)
                    
    for ii in [0..seq.length-1] by 1
      #if !((ii-4)%5) 
      #  fifth_base=" line-per-five-base" 
      #else 
      #  fifth_base=""
      
      fifth_base=""  
      ch = seq.charAt(ii)
      sec = struct.charAt(ii)
      
      if sec is "(" or sec is ")"
        bg_color = 'rgba(0,0,102,0.5)'
      else
        bg_color = 'rgba(255,255,0,0.5)'
   
      if shape_value is null or shape_value[0] == "FAILED"
        r_seq += '<span class="monospace'+fifth_base+'" style="background-color:'+bg_color+';color:grey;">'
      else
        if parseInt(shape_value[0],10)-1 > ii || ii >= shape_value.length + parseInt(shape_value[0],10)-1   
          r_seq += '<span class="monospace'+fifth_base+'" style="background-color:'+bg_color+';color:grey;">'
        else
          if shape_error? && parseFloat(shape_error[jj]) >= 0.8
            r_seq += '<span class="monospace red-border-for-err'+fifth_base+'" style="background-color:'+bg_color+';color:'
          else
            r_seq += '<span class="monospace'+fifth_base+'" style="background-color:'+bg_color+';color:' 

          v = parseFloat(shape_value[jj]) 
          t = 0.5
          if continuous
            if v < t 
              r_seq += @find_color_by_level(@find_level(min,max,t,v))
              r_seq += ';'
            else if v == t
              r_seq += '#FFFFFF;'
            else
              r_seq += @find_color_by_level(@find_level(min,max,t,v))
              r_seq += ';'
          else
            if v <= t 
              r_seq += '#2222FF;'
            else
              r_seq += '#FFFF00;'
          r_seq += '" title="location:'+ii+' shape value:'+v+'">'
          jj += 1
      r_seq += ch+'</span>'
      
    return r_seq
     
  format_sequence_exp_data_legacy : (seq, shape_value, shape_threshold, struct, continuous) ->
    if !seq
      return ""
    r_seq = ""
    
    jj = 1
    if shape_value?
      min_max = @find_min_max(shape_value)
      min = min_max['min']
      max = min_max['max']
      avg = @find_average(shape_value)
                    
    for ii in [0..seq.length-1] by 1
      if !((ii-4)%5) 
        fifth_base=" line-per-five-base" 
      else 
        fifth_base=""
        
      ch = seq.charAt(ii)
      sec = struct.charAt(ii)
      
      if sec is "(" or sec is ")"
        r_seq += '<span class="monospace'+fifth_base+'" style="font-family:arial;background-color:rgba(0,0,102,0.5);color:'
      else
        r_seq += '<span class="monospace'+fifth_base+'" style="font-family:arial;background-color:rgba(255,255,0,0.5);color:'
      
      if shape_value is null or shape_value[0] == "FAILED"
        r_seq += 'grey;">'
      else
        if parseInt(shape_value[0],10)-1 > ii || ii >= shape_value.length + parseInt(shape_value[0],10)-1   
          r_seq += 'grey;">'
        else
          v = parseFloat(shape_value[jj]) 
          t = parseFloat(shape_threshold)
          if continuous
            if v < t 
              r_seq += @find_color_by_level(@find_level(min,max,avg,v))
              r_seq += ';" title="location:'+ii+' shape value:'+v+'">'
            else if v == t
              r_seq += '#FFFFFF;" title="location:'+ii+' shape value:'+v+'">'
            else
              r_seq += @find_color_by_level(@find_level(min,max,avg,v))
              r_seq += ';" title="location:'+ii+' shape value:'+v+'">'
          else
            if v <= t 
              r_seq += '#2222FF;" title="location:'+ii+' shape value:'+v+'">'
            else
              r_seq += '#FFFF00;" title="location:'+ii+' shape value:'+v+'">'
          jj += 1
      r_seq += ch+'</span>'
      
    return r_seq

  format_sequence_exp_data_cont_bg : (seq, shape_value, shape_threshold, struct) ->
    if !seq
      return ""
    r_seq = ""
    
    jj = 1
    if shape_value?
      min_max = @find_min_max(shape_value)
      min = min_max['min']
      max = min_max['max']
      avg = @find_average(shape_value)
                    
    for ii in [0..seq.length-1] by 1
      if !((ii-4)%5) 
        fifth_base=" line-per-five-base" 
      else 
        fifth_base=""
        
      ch = seq.charAt(ii)
      sec = struct.charAt(ii)
      r_seq += '<span class="monospace'+fifth_base+'" style="font-family:arial;'
 
      if ch is "G"
        r_seq += 'color:#FF3333; background-color:'
      if ch is "C"
        r_seq += 'color:#33FF33; background-color:'
      if ch is "A"
        r_seq += 'color:#FFFF33; background-color:'
      if ch is "U" 
        r_seq += 'color:#7777FF; background-color:'
      
      if shape_value is null or shape_value[0] == "FAILED"
        r_seq += 'none;"'
      else
        if parseInt(shape_value[0],10)-1 > ii || ii >= shape_value.length + parseInt(shape_value[0],10)-1   
          r_seq += 'none;"'
        else
          v = parseFloat(shape_value[jj]) 
          t = parseFloat(shape_threshold)
          if v < t 
            r_seq += @find_color_by_level(@find_level(min,max,avg,v), true)
            r_seq += ';" title="location:'+ii+' shape value:'+v+'"'
          else if v == t
            r_seq += 'gray;" title="location:'+ii+' shape value:'+v+'"'
          else
            r_seq += @find_color_by_level(@find_level(min,max,avg,v), true)
            r_seq += ';" title="location:'+ii+' shape value:'+v+'"'
          jj += 1
      if ch is "G"
        r_seq += '>G</span>'
      if ch is "C"
        r_seq += '>C</span>'
      if ch is "A"
        r_seq += '>A</span>'
      if ch is "U" 
        r_seq += '>U</span>'
    return r_seq  

  generate_mutation_map : (sequence) ->
    pairs = {'A':'U', 'U':'A', 'G':'C', 'C':'G'}
    mutation_map = Array()
    mutation_title = Array()

    sequence = sequence.toUpperCase()
    mutation_map.push sequence
    mutation_title.push "WT"
    
    for i in [0..sequence.length-1] by 1
      if k = pairs[sequence.charAt(i)]
        mutation_map.push sequence.substring(0,i)+k+sequence.substring(i+1,sequence.length)
        mutation_title.push sequence.charAt(i)+(i+1)+k
      else
        return null
    
    mmaps = Array()
    mmaps['map'] = mutation_map
    mmaps['title'] = mutation_title
    
    return mmaps;
    
  transform : (shape_value, min, max) ->
    for ii in [1..shape_value.length-1] by 1
      if shape_value[ii] > max
        shape_value[ii] = 1
      if shape_value[ii] < min
        shape_value[ii] = 0
    return shape_value
    
  find_min_max : (shape) ->
    min = 9999
    max = -9999
    NUM_COLORS = 5
    
    for ii in [1..shape.length-1] by 1
      if shape[ii] <= min
        min = shape[ii]
      if shape[ii] >= max
        max = shape[ii]
    return {'min':min, 'max':max}
    
  find_average : (shape) ->
    total = 0
    for ii in [1..shape.length-1] by 1
      total += parseInt(shape[ii])
    return total*1.0/(shape.length-1)
  find_level : (min,max,avg, v) ->
    diff = v- avg
    NUM_COLORS = 5
    if diff > 0
      diff = diff/(max-avg)
      if diff > 1 then diff=1
      if diff < 0 then diff=0
      level = Math.round(NUM_COLORS*diff)#+NUM_COLORS
    else
      diff *= -1
      diff = diff/(avg-min)
      if diff > 1 then diff = 1 
      if diff < 0 then diff = 0
      level = Math.round(NUM_COLORS*diff)*-1#+NUM_COLORS
    return level
      
  find_color_by_level : (level, grayscale) ->
    NUM_COLORS = 5
    diff = 1.0/NUM_COLORS * level
    if grayscale is true
      UNEXPOSED_R = 255 
      UNEXPOSED_G = 255
      UNEXPOSED_B = 255
      EXPOSED_R = 0
      EXPOSED_G = 0
      EXPOSED_B = 0
      MID_R = 127
      MID_G = 127
      MID_B = 127
    else
      UNEXPOSED_R = 34
      UNEXPOSED_G = 34
      UNEXPOSED_B = 255
      EXPOSED_R = 255
      EXPOSED_G = 255
      EXPOSED_B = 0
      MID_R = 255
      MID_G = 255
      MID_B = 255
    
    if diff > 0
      r = EXPOSED_R * diff + MID_R * (1-diff)
      g = EXPOSED_G * diff + MID_G * (1-diff)
      b = EXPOSED_B * diff + MID_B * (1-diff)
    else
      diff *= -1
      r = UNEXPOSED_R * diff + MID_R * (1-diff)
      g = UNEXPOSED_G * diff + MID_G * (1-diff)
      b = UNEXPOSED_B * diff + MID_B * (1-diff)
    return 'rgb('+Math.floor(r)+','+Math.floor(g)+','+Math.floor(b)+')'

  format_sequence_exp_data : (seq, shape_value, shape_threshold, struct, version) ->
    if !seq
      return ""
    r_seq = ""
    
    jj = 1  
    
    if shape_value?
      min_max = @find_min_max(shape_value)
      min = min_max['min']
      max = min_max['max']
                    
    for ii in [0..seq.length-1] by 1
      if !((ii-4)%5)
        fifth_base = " line-per-five-base"
      else
        fifth_base = ""
        
      ch = seq.charAt(ii)
      sec = struct.charAt(ii)
      
      if version == 3
        if sec is "(" or sec is ")"
          r_seq += '<span class="monospace'+fifth_base+'" style="font-family:arial;'
        else
          r_seq += '<span class="monospace'+fifth_base+'" style="font-family:arial;'
      else  
        if sec is "(" or sec is ")"
          r_seq += '<span class="monospace'+fifth_base+'" style="font-family:arial;background-color:rgba(0,0,102,0.5);color:'
        else
          r_seq += '<span class="monospace'+fifth_base+'" style="font-family:arial;background-color:rgba(255,255,0,0.5);color:'
      
      if shape_value is null or shape_value[0] == "FAILED"
        if version == 3
          r_seq += ' color:grey;">'
        else
          r_seq += 'grey;">'
      else
        if parseInt(shape_value[0],10)-1 > ii || ii >= shape_value.length + parseInt(shape_value[0],10)-1   
          r_seq += 'grey;">'
        else
          v = parseFloat(shape_value[jj]) 
          t = parseFloat(shape_threshold)

          if version == 2
            if v < t 
              r_seq += @find_color(min,max,v,t)
              r_seq += ';" title="location:'+ii+' shape value:'+v+'">'
            else if v == t
              r_seq += '#FFFFFF;" title="location:'+ii+' shape value:'+v+'">'
            else
              r_seq += @find_color(min,max,v,t)
              r_seq += ';" title="location:'+ii+' shape value:'+v+'">'
          else
            if version == 1
              if v <= t 
                r_seq += '#2222FF;" title="location:'+ii+' shape value:'+v+'">'
              else
                r_seq += '#FFFF00;" title="location:'+ii+' shape value:'+v+'">'
            else
              level = (v-min)*10/(max-min)
              bgcolor = Math.floor(255*level*0.1)
              bg = 'rgba('+bgcolor+','+bgcolor+','+bgcolor+',0.75)'
              if v <= t 
                r_seq += ' background-color:'+bg+'; color:#2222FF;" title="location:'+ii+' shape value:'+v+'">'
              else
                r_seq += ' background-color:'+bg+'; color:#FFFF00;" title="location:'+ii+' shape value:'+v+'">'
          jj += 1
      
      r_seq += ch+'</span>'
    return r_seq
  
  draw_secstructure : (secstruct, div, sequence, shape_value, shape_threshold, in_canvas, using_line, primary_space, pair_space, line_width) ->
    if !secstruct
      return ""
    
    rna_layout_layer = null
    if in_canvas != true
      div.addClass("rna-canvas-outer")
      innerHTML = ''
      innerHTML += '<div class="green-button clickable rounded-5 rna-canvas-zoom" id="zoom-out-'+div.attr('id')+'"><div class="green-button-bg"></div> - </div>'          
      innerHTML += '<div class="green-button clickable rounded-5 rna-canvas-zoom" id="zoom-in-'+div.attr('id')+'" ><div class="green-button-bg"></div> + </div>'
      innerHTML += '<div class="clearer"></div>'
      innerHTML += '<div id="_'+div.attr('id')+'" class="rna-canvas"></div>'
      div.append(innerHTML)
      
      $('#zoom-out-'+div.attr('id')).on("click",() ->
        rna_layout_layer.zoom_out()
      )
  
      $('#zoom-in-'+div.attr('id')).on("click",() ->
        rna_layout_layer.zoom_in()
      )
          
      if inner_div = div.children("#_"+div.attr('id'))
        rna_tree_root = new RNATree( secstruct )
        rna_layout_layer = new RNALayout( rna_tree_root, inner_div, secstruct, sequence, primary_space, pair_space)
        rna_layout_layer.draw_tree_in_html( sequence, shape_value, shape_threshold )
        return rna_layout_layer
        
    else
      rna_tree_root = new RNATree(secstruct)
      rna_layout_layer = new RNALayout(rna_tree_root, div, secstruct, sequence, primary_space, pair_space)
      thumbnail_canvas = div.children()
      rna_layout_layer.draw_tree_in_canvas(thumbnail_canvas[0], using_line, line_width)
      return rna_layout_layer      
    
    window.onload = () ->
      if in_canvas
        rna_tree_root = new RNATree(secstruct)
        rna_layout_layer = new RNALayout(rna_tree_root, div, secstruct, sequence, primary_space, pair_space)
        thumbnail_canvas = div.children()
        rna_layout_layer.draw_tree_in_canvas(thumbnail_canvas[0], using_line, line_width)
        return rna_layout_layer
}

class @RNATreeNode 
  constructor : () ->
    @children_ = new Array
    @index_a_ = -1
    @index_b_ = -1
    @is_pair_ = false;

class @RNATree
  constructor : ( secstruct ) ->
    @root = null
    if secstruct?
      @create_tree(secstruct)          
    return @root
        
  get_root : () ->
    return @root
  
  create_tree : ( secstruct ) ->
    @root = new RNATreeNode
    pairs = @get_pairmap(secstruct)
    @setup_tree(pairs, @root)

  get_pairmap : (secstruct) ->
    pair_stack = new Array
    pairs_array = new Array
  
    for ii in [0..secstruct.length-1] by 1
      pairs_array.push(-1)
        
    for ii in [0..secstruct.length-1] by 1
      if secstruct.charAt(ii) is "("
        pair_stack.push(ii)
      else if secstruct.charAt(ii) is ")"
        index = pair_stack.pop()
        pairs_array[index] = ii
        pairs_array[ii] = index   
    
    return pairs_array

  setup_tree : (pairs, root) ->    
    bi_pairs = new Array(pairs.length)
    
    for ii in [0..pairs.length-1] by 1
      bi_pairs[ii] = -1
    
    for ii in [0..pairs.length-1] by 1
      if( ii < pairs[ii] )
        bi_pairs[ii] = pairs[ii]
        bi_pairs[pairs[ii]] = ii        
    
    for ii in [0..bi_pairs.length-1] by 1
      if( bi_pairs[ii] >= 0 )
        @add_nodes(bi_pairs, root, ii, bi_pairs[ii])
        _k = bi_pairs[ii]
      else
        new_sub_node = new RNATreeNode
        new_sub_node.is_pair_ = false
        new_sub_node.index_a_ = ii
        root.children_.push(new_sub_node)        
    return

   add_nodes : (bi_pairs, root, start, end) ->
     if (start > end)       
       return
     
     new_node = new RNATreeNode
     
     if(bi_pairs[start] == end)
       new_node.is_pair_ = true;
       new_node.index_a_ = start
       new_node.index_b_ = end
       @add_nodes(bi_pairs, new_node, start+1, end-1)
     else
       for jj in [start..end] by 1
         if (bi_pairs[jj] >= 0)           
           @add_nodes(bi_pairs, new_node, jj, bi_pairs[jj])           
           _i = bi_pairs[jj]
         else
           new_sub_node = new RNATreeNode
           new_sub_node.is_pair_ = false
           new_sub_node.index_a_ = jj
           new_node.children_.push(new_sub_node)
              
     root.children_.push(new_node)
     return


class @RNALayout

  constructor : (root, div, secstruct, sequence, primary_space, pair_space) ->
    @root = root
    @div = div
    @secstruct = secstruct
    @sequence = sequence
    @node_r = 7
    if primary_space?
      @PRIMARY_SPACE = primary_space
    else
      @PRIMARY_SPACE = 10
    if pair_space?
      @PAIR_SPACE = pair_space
    else
      @PAIR_SPACE = 10
    @x_array = new Array
    @y_array = new Array
    
    @draw_tree()
    
  draw_tree : () ->
    if @root?
      @draw_tree_recursive( @root, null, 0, 0, 0, 1)
       
  draw_tree_recursive : (root, parent, start_x, start_y, go_x, go_y) ->
    cross_x = -go_y
    cross_y = go_x
       
    children_width = root.children_.length * @node_r * 2.0
    
    root.go_x_ = go_x
    root.go_y_ = go_y
    
    if(root.children_.length == 1)
      root.x_ = start_x
      root.y_ = start_y      
      if(root.children_[0].is_pair_)
        @draw_tree_recursive(root.children_[0], root, start_x + go_x * @PRIMARY_SPACE, start_y + go_y * @PRIMARY_SPACE, go_x, go_y)
      else if(!root.children_[0].is_pair_ && root.children_[0].index_a_ < 0)
        @draw_tree_recursive(root.children_[0], root, start_x, start_y, go_x, go_y)
      else
        @draw_tree_recursive(root.children_[0], root, start_x + go_x * @PRIMARY_SPACE, start_y + go_y * @PRIMARY_SPACE, go_x, go_y);
    else if (root.children_.length > 1)      
      npairs = 0      
      for ii in [0..root.children_.length-1] by 1
        if(root.children_[ii].is_pair_)
          npairs += 1
    
      circle_length = (root.children_.length + 1) * @PRIMARY_SPACE * 1.0 + (npairs + 1) * @PAIR_SPACE * 1.0    
      circle_radius = circle_length / (2.0 * Math.PI)
      length_walker = @PAIR_SPACE / 2.0
      
      if parent?
        root.x_ = parent.x_ + go_x * circle_radius * 1.0
        root.y_ = parent.y_ + go_y * circle_radius * 1.0        
      else
        root.x_ = go_x * circle_radius * 1.0
        root.y_ = go_y * circle_radius * 1.0
        
      
      for ii in [0..root.children_.length-1] by 1
        length_walker += @PRIMARY_SPACE
        
        if(root.children_[ii].is_pair_)
          length_walker += @PAIR_SPACE / 2.0
          
        rad_angle = length_walker/circle_length * 2 * Math.PI - Math.PI / 2.0;
        child_x = root.x_ + Math.cos(rad_angle) * cross_x * circle_radius + Math.sin(rad_angle) * go_x * circle_radius * 1.0
        child_y = root.y_ + Math.cos(rad_angle) * cross_y * circle_radius + Math.sin(rad_angle) * go_y * circle_radius * 1.0
        
        child_go_x = child_x - root.x_
        child_go_y = child_y - root.y_
        child_go_len = Math.sqrt(child_go_x * child_go_x * 1.0 + child_go_y * child_go_y * 1.0)
                
        @draw_tree_recursive(root.children_[ii], root, child_x, child_y, child_go_x/child_go_len, child_go_y/child_go_len)
        
        if(root.children_[ii].is_pair_)
          length_walker += @PAIR_SPACE / 2.0
    else
      root.x_ = start_x
      root.y_ = start_y
  
  get_coords : () ->
    if @root?
      @get_coords_recursive( @root )
    
  get_coords_recursive : ( root ) ->        
    if( root.is_pair_ )
      cross_x = -root.go_y_
      cross_y = root.go_x_
      @x_array[root.index_a_] = root.x_ + cross_x * @PAIR_SPACE/2.0
      @x_array[root.index_b_] = root.x_ - cross_x * @PAIR_SPACE/2.0
      @y_array[root.index_a_] = root.y_ + cross_y * @PAIR_SPACE/2.0
      @y_array[root.index_b_] = root.y_ - cross_y * @PAIR_SPACE/2.0
    else if(root.index_a_ >= 0)
      @x_array[root.index_a_] = root.x_
      @y_array[root.index_a_] = root.y_    
    
    for ii in [0..root.children_.length-1] by 1
      @get_coords_recursive(root.children_[ii])    
  
  set_sizes : () ->
    node_r = @node_r
    x_array = @x_array
    y_array = @y_array
    
    min_x = x_array[0] - node_r
    max_x = x_array[0] + node_r
    min_y = y_array[0] - node_r    
    max_y = y_array[0] + node_r
      
    for ii in [0..x_array.length-1] by 1
      x = x_array[ii]
      if (x - node_r) < min_x
        min_x = x - node_r        
      if (x + node_r) > max_x
        max_x = x + node_r
    
    for ii in [0..y_array.length-1] by 1
      y = y_array[ii]
      if (y - node_r) < min_y
        min_y = y - node_r
      if (y + node_r) > max_y
        max_y = y + node_r
    
    for ii in [0..x_array.length-1] by 1
      x_array[ii] -= min_x
      y_array[ii] -= min_y
          
    @width = max_x - min_x
    @height = max_y - min_y
    
  recoordinate : ( new_width ) ->
    original_width = @width
    original_height = @height
    node_r = @node_r
    x_array = @x_array
    y_array = @y_array
    
    ratio = new_width/original_width
    for ii in [0..x_array.length-1] by 1
      @x_array[ii] = x_array[ii] * ratio
      @y_array[ii] = y_array[ii] * ratio
    
    @width = original_width * ratio
    @height = original_height * ratio
    @node_r =  node_r * ratio    
  
  layout_draggable : () ->
    @div.draggable();
    
  verify_structure : ( secstruct ) ->
    for ii in [0..secstruct.length-1] by 1
      ch = secstruct.charAt(ii)
      if ch isnt '.' and  ch isnt '(' and ch isnt ')'
        return false    
    return true
  
  verify_sequence : ( sequence ) ->
    if sequence.length is @secstruct.length
      for ii in [0..sequence.length-1] by 1
        ch = sequence.charAt(ii).toUpperCase()
        if ch isnt 'A' and ch isnt 'U' and ch isnt 'G' and ch isnt 'C'
          return false
      return true
    else
      return false
  
  initialize : () ->
    @root = null
    @x_array = new Array
    @y_array = new Array
  
  change_structure_to : ( secstruct ) ->
    if @verify_structure( secstruct )
      rna_tree_root = new RNATree( secstruct )
      @initialize()
      @remove_redundant_bases( secstruct )
      @root = rna_tree_root
      @secstruct = secstruct
      @draw_tree()
      @get_coords()
      @set_sizes()
      @animate_bases(null)
      return true
    else  
      return false 
  
  remove_redundant_bases : ( curr ) ->
    canvas_id = @div.attr('id');
    for ii in [curr.length..@secstruct.length-1] by 1
      $('#'+canvas_id+'-base-'+ii).remove()
 
  change_sequence_to : ( sequence ) ->
    if sequence isnt null and @verify_sequence( sequence )
      @sequence = sequence
      for ii in [0..sequence.length-1] by 1
        canvas_id = @div.attr('id')
        $('#'+canvas_id+'-base-'+ii).removeClass()
        $('#'+canvas_id+'-base-'+ii).addClass(sequence.charAt(ii).toUpperCase()+'-base')
      return true        
    else
      return false
  
  animate_bases : ( zoom ) ->   
    if zoom?
      new_width = @width
      if zoom is "zoom_in"
        new_width = new_width * 1.2
      else
        new_width = new_width * 5/6
      
      @recoordinate(new_width)
      @div.width(@width)
    
    x_array = @x_array
    y_array = @y_array
    node_r = @node_r

    innerHTML = ""
    innerSTYLE = ""
    
    for ii in [0..x_array.length-1] by 1
      canvas_id = @div.attr('id');
      $base_panel = $('#'+canvas_id+'-base-'+ii) 
      left = x_array[ii] 
      top = y_array[ii]
      if $base_panel.length isnt 0      
        $base_panel.animate({ left: left.toFixed(3)+'px', top: top.toFixed(3)+'px'}, "false");
        innerSTYLE += '#'+canvas_id+'-base-'+ii+' { width: '+Math.ceil(node_r)+'px; height:'+Math.ceil(node_r)+'px; background-size:'+Math.floor(node_r)+'px }\n';
      else
        innerHTML += '<span id="'+canvas_id+'-base-'+ii+'" class="N-base"></span>';
        innerSTYLE += '#'+canvas_id+'-base-'+ii+' { width: '+Math.ceil(node_r)+'px; height:'+Math.ceil(node_r)+'px; left:'+x_array[ii]+'px; top:'+y_array[ii]+'px; background-size:'+Math.floor(node_r)+'px }\n';
        
    @div.append(innerHTML)    
    @add_bases_style(innerSTYLE, canvas_id)
  
  add_bases_style : ( bases_style, canvas_id) ->
    css_id = canvas_id+'_css'
    if !(style = document.getElementById(css_id))
      style = document.createElement('style')
      style.id = css_id
      style.type = 'text/css';
    style.innerHTML = bases_style
    document.getElementsByTagName('head')[0].appendChild(style);
    
  add_zoom_javascript : ( zoom_javascript ) ->
    script = document.createElement("script");
    script.type  = "text/javascript";
    script.innerHTML = zoom_javascript
    document.body.appendChild(script); 
  
  reset_canvas_height : ( height ) ->
    @height = height
    @div.height( height )
    
  reset_canvas_parent_height : ( height ) ->
    @div.parent().height( height + 55 )

  reset_canvas_parent_width : ( width ) ->
    @div.parent().width( width + 55 )
    
  reset_canvas_width : ( width ) ->
    @width = width
    @div.width( width ) 
    
  draw_line : (context, line_width) ->
    context.clearRect(0,0,@width,@height)
    
    context.beginPath()
    context.lineWidth = line_width;
    context.strokeStyle = '#ffffff'

    for ii in [0..@x_array.length-2] by 1
      x = @x_array[ii]
      y = @y_array[ii]
      context.moveTo(x, y)
      next_x = @x_array[ii+1]
      next_y = @y_array[ii+1]
      context.lineTo(next_x, next_y)
    
    context.stroke()
          
  draw_dot : (context) ->
    context.beginPath()
    radius = 3.5
    
    for ii in [0..@x_array.length-1] by 1
      x = @x_array[ii]
      y = @y_array[ii]
      context.arc(x, y, radius, 0, 2 * Math.PI, false)
      context.fillStyle = '#ffffff'
      context.fill()
      
  draw_tree_in_canvas : (canvas, using_line, line_width) ->
    @get_coords()
    @set_sizes()

    canvas.width = @width
    canvas.height = @height
       
    #cont_width = @div.width()
    #if cont_width < @width and cont_width > 0
    #  @recoordinate(cont_width)
    
    context = canvas.getContext('2d')
    if using_line is true
      @draw_line(context, line_width)
    else
      @draw_dot(context, line_width)
      
  draw_tree_in_html : ( sequence, shape_value, shape_threshold ) ->
    @get_coords()
    @set_sizes()
    cont_width = @div.width()        
    if cont_width < @width and cont_width > 0 
      @recoordinate( cont_width )
        
    innerHTML = ""
    innerSTYLE = ""
    canvas_id = @div.attr('id');
    jj = 1
        
    x_array = @x_array
    y_array = @y_array
    node_r = @node_r

    if sequence?
        sequence = sequence.toUpperCase()
    
    for ii in [0..x_array.length-1] by 1    
      innerHTML += '<span id="'+canvas_id+'-base-'+ii+'" ';
      
      if sequence?    
        base = sequence.charAt(ii)
        if (base?) and (base.length > 0) and (base == "A" or base == "G" or base == "U" or base == "C")
          innerHTML += 'class="'+ base + '-base"></span>'
        else
          innerHTML += 'class="N-base"></span>'
      else if shape_value is null or shape_value[0] == "FAILED"
        innerHTML += 'class="N-base"></span>'
      else
        if parseInt(shape_value[0],10)-1 > ii || ii >= shape_value.length + parseInt(shape_value[0],10)-1   
          innerHTML += 'class="N-base"></span>'
        else
          v = parseFloat(shape_value[jj]) 
          t = parseFloat(shape_threshold)
          if v <= t 
            innerHTML += 'class="U-base"></span>'
          else
            innerHTML += 'class="A-base"></span>'
          jj += 1        
      
      innerSTYLE += '#'+canvas_id+'-base-'+ii+' { width: '+Math.ceil(node_r)+'px; height:'+Math.ceil(node_r)+'px; left:'+x_array[ii]+'px; top:'+y_array[ii]+'px; background-size:'+Math.floor(node_r)+'px }\n';            
    @div.html(innerHTML)
    @add_bases_style(innerSTYLE,canvas_id)
    @layout_draggable()    
    
    @reset_canvas_width( @width )
    @reset_canvas_height( @height )
    @reset_canvas_parent_height ( @height )
    #@reset_canvas_parent_width ( @width )
  
  zoom_in : () ->
    @animate_bases( "zoom_in" )    
  
  zoom_out : () ->
    @animate_bases( "zoom_out" )
