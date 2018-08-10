class @BuilderLabs extends Builder
  on_build : (block, $container, params) ->
    Application.track_google_analytics_event("lab","open","")

    skip = 0
    if params['skip']?
      skip = parseInt(params['skip'])
    else
      params['skip'] = skip

    size = 21
    if params['size']?
      size = parseInt(params['size'])
    else
      params['size'] = 21

    PageData.get_labs(params['lab_type'], params, (page) =>
      labs = page['labs']

      for lab in labs
        lab['is_expert'] = lab['affiliation'] != null
        if lab['body']?
          lab['short_body'] = Utils.shorten_str(lab['body'], 60)

        if lab['affiliation']?
          try
            affiliation = JSON.parse(lab['affiliation'])
            if affiliation['name']?
              lab['affiliation'] = affiliation['name']
              lab['affiliation_url'] = affiliation['url']

        if !(lab['cover_image']?)
          lab['cover_image'] = EternaUtils.get_puzzle_middle_thumbnail(lab['puzzles'][0]['puzzles'][0])
        if !(lab['num_synth']?)
          lab['num_synth'] = 0
        if lab['selection'] == "admin"
          lab['selection'] = "Admin selection"
        else
          lab['selection'] = "User voting"
        lab['founder_picture'] = EternaUtils.get_user_picture(lab['founder_picture'])

        if params['lab_type'] is "waiting_projects"
          lab['waiting'] = true

      params['total_labs'] = page['num_labs']
      params['total_synth_slots'] = page['num_slots']

      if Application.CURRENT_USER?
        if Application.CURRENT_USER['points']?
          if parseInt(Application.CURRENT_USER['points']) >= 20000
            params['puzzle_creatable'] = true

      param_string = {}
      param_string.single = if params['single'] then params['single'] else undefined
      param_string.switch = if params['switch'] then params['switch'] else undefined

      skip = params['skip']
      if !(skip?)
        skip = 0

      size = params['size']
      if !(size?)
        size = 21

      param_string.skip = skip
      param_string.size = size
      param_string.search = params['search']
      sort = params['sort']
      if !(sort?)
        sort = "date"

      param_string.sort = "date"
      if params['lab_type'] is "past_projects"
        params.date_sort_url = "/web/labs/past/?" + Utils.generate_parameter_string(param_string)
      else if params['lab_type'] is "pending_projects"
        params.date_sort_url = "/web/labs/proposed/?" + Utils.generate_parameter_string(param_string)
      else
        params.date_sort_url = "/web/labs/?" + Utils.generate_parameter_string(param_string)

      param_string.sort = "synthesis"
      if params['lab_type'] is "past_projects"
        params.synthesis_sort_url = "/web/labs/past/?" + Utils.generate_parameter_string(param_string)
      else if params['lab_type'] is "pending_projects"
        params.synthesis_sort_url = "/web/labs/proposed/?" + Utils.generate_parameter_string(param_string)
      else
        params.synthesis_sort_url = "/web/labs/?" + Utils.generate_parameter_string(param_string)

      params.sort = sort
      param_string.sort = sort

      params['num_voters'] = page['num_voters']
      ThemeCompiler.compile_block(block,params,$container)

      if $labs = @get_element("labs")
        packer = Packers($labs)
        packer.add(labs)

      if $single = @get_element("single")
        if params['single'] is "checked" then $single.attr("checked", true)

        $single.click(() =>
          if params['single'] isnt "checked" then param_string.single="checked" else param_string.single=undefined
          if params['lab_type'] is "past_projects"
            url = "/web/labs/past/?" + Utils.generate_parameter_string(param_string)
          else
            url = "/web/labs/?" + Utils.generate_parameter_string(param_string)
          Utils.redirect_to(url)
        )

      if $switch = @get_element("switch")
        if params['switch'] is "checked" then $switch.attr("checked", true)
        $switch.click(() =>
          if params['switch'] isnt "checked" then param_string.switch="checked" else param_string.switch=undefined
          if params['lab_type'] is "past_projects"
            url = "/web/labs/past/?" + Utils.generate_parameter_string(param_string)
          else
            url = "/web/labs/?" + Utils.generate_parameter_string(param_string)
          Utils.redirect_to(url)
        )

      if $search = @get_element("search")
        if params['search'] then $search.attr("value", params['search'])
        $search.keyup((e) =>
          if e.keyCode == KeyCode.KEYCODE_ENTER
            search = $search.attr("value")
            if params['lab_type'] is "past_projects" then url = "/web/labs/past/?"
            else if params['lab_type'] is "pending_projects" then url = "/web/labs/proposed/?"
            else if params['lab_type'] is "waiting_projects" then url = "/web/labs/waiting/?"
            else url = "/web/labs/?"
            param_string.search = search
            param_string.skip = 0
            url += Utils.generate_parameter_string(param_string)
            Utils.redirect_to(url)
        )

      total_labs = page["num_labs"]
      if $pager = @get_element("pager")
        pager_str = EternaUtils.get_pager(Math.floor(skip/size), Math.ceil(total_labs/size), (pageindex) =>
          url_params = {skip:pageindex * size, size:size, search:params['search'], sort:sort, project_type:params['project_type']}
          if params['lab_type'] is "past_projects" then url = "/web/labs/past/?"
          else if params['lab_type'] is "pending_projects" then url = "/web/labs/proposed/?"
          else if params['lab_type'] is "waiting_projects" then url = "/web/labs/waiting/?"
          else url = "/web/labs/?"
          return url + Utils.generate_parameter_string(url_params, true)
        )
        $pager.html(pager_str)
    )

class @BuilderLab extends Builder

  on_build : (block ,$container, params) ->
    params['conclusion_points'] = '500'
    if params['nid'] > 3676067 && params['winner'] = 1
      params['conclusion_points'] = '2000'
    params['body'] = EternaUtils.format_body(params['body'])
    params['thumbnail'] = EternaUtils.get_puzzle_middle_thumbnail(params['nid'])
    if params['winners']
      params['num_winners'] = params['winners'].length
    else
      params['num_winners'] = 0
    ThemeCompiler.compile_block(block,params,$container)
    if winners_data = params["winners"]
      if winners_block = Blocks("winners-info")
        for ii in [0..winners_data.length-1] by 1
          if $winnersinfo = @get_element("winnersinfo")
            winners_block.add_block($winnersinfo, {picture:EternaUtils.get_user_picture(winners_data[ii]['picture']), title: winners_data[ii]['title'], score: winners_data[ii]['synthesis-score'], puznid:winners_data[ii]['puznid'], solnid: winners_data[ii]['id'],name: winners_data[ii]['name'], uid:winners_data[ii]['uid'], puztitle:winners_data[ii]['puztitle']})

class @BuilderLabPage extends Builder

  on_build : (block,$container,params) ->
    nid = params['nid']

    if !(nid?)
      Utils.display_error("nid missing?")
      return

    PageData.get_lab(nid, (page) =>
      lab = page['lab']
      params = @parse_state(page, params)
      results_empty = true
      params['num_top_solutions'] = 0
      if lab['synthesized_solutions']?
        if lab['synthesized_solutions'].length > 0
          results_empty = false
          params['num_top_solutions'] = lab['synthesized_solutions'].length
      params['results_empty'] = results_empty
      params['comments'] = page['comments']
      params['project_type'] = lab['project_type']
      params['is_featured'] = lab['is_featured']
      ThemeCompiler.compile_block(block,params,$container)

      puzzle_history = lab['puzzles']
      if $project_puzzles = @get_element("project_history")
        round_block = Blocks("project-round-block")
        for ii in [puzzle_history.length-1..0] by -1
          round = puzzle_history[ii]['round']
          puzzles = puzzle_history[ii]['puzzles']
          round_params = {}
          states = JSON.parse(params['states'])
          if (ii == puzzle_history.length-1) and (params['is_active'] or params['is_pending'] or params['is_expert_pending'])
            round_params['current_round'] = true
            states['focused'] = true
            states['is_active'] = params['is_active']
          else
            round_params['current_round'] = false
            states['is_active'] = false
          round_params['states'] = JSON.stringify(states)
          round_params['round'] = ii + 1
          round_params['round_title'] = "Round "+ round_params['round']
          round_params['puzzles'] = puzzles
          round_params['is_playable'] = puzzle_history[ii]['is_playable'] || (lab['affiliation'] == null)
          round_block.add_block($project_puzzles,round_params)

      if !params['is_pending']
        @show_project_status(lab)

      if $co = @get_element("synthesized")
        @show_synthesis_results($co, lab['synthesized_solutions'])

      if page['follow']? && page['follow'][0]?
        params['is_already_followed'] = true
        @show_unfollow()
      else
        params['is_already_followed'] = false
        @show_follow()

      @draw_target_structure(@, lab)
      if $delete_proposed_lab = @get_element("delete-proposed-lab")
        $delete_proposed_lab.click(() =>
          if confirm("Are you sure want to delete your project?")
            Overlay.set_loading("")
            Overlay.show()
            PageData.delete_proposed_lab(lab['nid'], (data) =>
              if data['success']
                Utils.display_error("Delete success")
                Utils.redirect_to("/web/labs/proposed/")
              else
                Utils.display_error("Delete fail")
            )
            Overlay.hide()
        )

      if $start_next_round = @get_element("start_next_round")
        $start_next_round.click(()=>
          if params['is_expert']
            Utils.redirect_to("/web/propose/nextround/sequences/"+nid+"/")
          else
            Utils.redirect_to("/web/propose/nextround/puzzle/"+nid+"/")
        )

      @hide_save_conclusion()
      $conclusion_text = @get_element("conclusion-text")
      if $conclude_edit = @get_element("conclusion-edit")
        $conclude_edit.click(() =>
          Overlay.set_loading("")
          Overlay.show()
          @hide_edit_conclusion()
          @show_save_conclusion()
          Overlay.hide()
        )
      if $conclude_save = @get_element("conclusion-submit")
        $conclude_save.click(() =>
          Overlay.set_loading("")
          Overlay.show()
          $concludetext = $conclusion_text.attr("value");
          PageData.post_project_conclusion(nid, $concludetext, (data) =>
            if data['success']
              Utils.redirect_to("/web/lab/"+nid+"/")
            else
              alert "Save Conclusion fail"
            Overlay.hide()
          )
        )

      if $follow = @get_element("follow")
        $follow.click(() =>
          Overlay.set_loading("")
          Overlay.show()
          Follow.follow(nid, "node", null, (data) =>
            if data['success']
              @show_unfollow()
            else
              alert "Follow fail"
            Overlay.hide()
          )
        )

      if $unfollow = @get_element("unfollow")
        $unfollow.click(() =>
          Overlay.set_loading("")
          Overlay.show()
          Follow.expire_follow(nid, "node", (data) =>
            if data['success']
              @show_follow()
            else
              alert "Unfollow fail"
            Overlay.hide()
          )
        )
    )

  show_project_status : (lab) ->
    if lab['exp_phase'] is null and lab['winner']?
      curr_phase = 5
    else
      curr_phase = parseInt(lab['exp_phase'])

    if curr_phase?
      for ii in [1..curr_phase-1] by 1
        if $thumbnail = @get_element("status_thumbnail_#{ii}")
          $thumbnail.attr("src", "https://s3.amazonaws.com/eterna/eterna2/tracker/active-"+ii+".png")
        if $bar = @get_element("status_bar_#{ii}")
          $bar.css('background-color', '#3192AC')

      if $curr_thumbnail = @get_element("status_thumbnail_#{curr_phase}")
        $curr_thumbnail.attr("src","https://s3.amazonaws.com/eterna/eterna2/tracker/active-"+ii+".png")
        $curr_thumbnail.removeClass("deactive_thumbnail").addClass("active_thumbnail")

        if lab['exp_phase_end']
          date = new Date(lab['exp_phase_end'] * 1000)
          $curr_thumbnail.attr('title','Expected Completion Date: '+date)
        else
          $curr_thumbnail.attr('title','Expected Completion Date: not applicable')

      if $prev_bar = @get_element("status_bar_#{curr_phase}")
        $prev_bar.removeClass("long_progress_bar").addClass("prev_progress_bar")
        $prev_bar.css('background-color','#3192AC')

      if $curr_bar = @get_element("status_bar_#{curr_phase+1}")
        $curr_bar.removeClass("long_progress_bar").addClass("curr_progress_bar")

      curr_time = lab['curr_time']
      if start = parseInt(lab['exp_phase_start'])
        past_minutes = (curr_time-start)/60
        if end = parseInt(lab['exp_phase_end'])
          expected_minutes = (end-start)/60
        else
          expected_minutes = 1440
      else
        past_minutes = 0
      percentage = Math.floor((past_minutes/expected_minutes)*100)

      if $curr_bar
        if percentage >= 100
          $curr_bar.css('background-color','#3192AC')
        else
          $curr_bar.css('background', 'linear-gradient(left, #3192ac +'+percentage+'%,#cccccc '+percentage+'%)')
          $curr_bar.css('background', '-webkit-linear-gradient(left, #3192ac +'+percentage+'%,#cccccc '+percentage+'%)')
          $curr_bar.css('background', '-moz-linear-gradient(left, #3192ac +'+percentage+'%,#cccccc '+percentage+'%)')
          $curr_bar.css('background', '-o-linear-gradient(left, #3192ac +'+percentage+'%,#cccccc '+percentage+'%)')

  show_synthesis_results : ($co, synthesized_results) ->
    $box = @get_element("top-players-box")
    top_players_block = Blocks("top-players")
    for ii in [0..synthesized_results.length-1] by 1
      synthesis_score = synthesized_results[ii]['synthesis-score']
      if synthesis_data_string = synthesized_results[ii]['synthesis-data']
        if synthesis_data = JSON.parse(synthesis_data_string)
          if synthesis_data['type'] == "brent_theo"
            c_before = parseFloat(synthesis_data['ribo_without_theo']).toFixed(3)
            c_after = parseFloat(synthesis_data['ribo_with_theo']).toFixed(3)
            synthesis_score = parseFloat(synthesis_data['score']).toFixed(3)+"x"
            synthesis_score += " (" + c_before + " / " + c_after + ")"
      top_players_block.add_block($box, {picture:EternaUtils.get_user_picture(synthesized_results[ii]['picture']), title: synthesized_results[ii]['title'], score: synthesis_score, name: synthesized_results[ii]['name'], uid:synthesized_results[ii]['uid'], puznid:synthesized_results[ii]['puznid'], puztitle:synthesized_results[ii]['puztitle'],solnid:synthesized_results[ii]['id']})


  parse_state : (page, params) ->
    lab = page['lab']
    if lab['affiliation']?
      try
        affiliation = JSON.parse(lab['affiliation'])
        if affiliation['name']?
          params['affiliation'] = affiliation['name']
          params['affiliation_url'] = affiliation['url']
        else
          params['affiliation'] = lab['affiliation']
        params['is_expert'] = true
      catch e
        params['affiliation'] = lab['affiliation']
        params['is_expert']  = true

    params['is_expert'] = lab['affiliation'] != null
    params['waiting'] = parseInt(lab['exp_phase']) == 2
    if lab['selection'] == "admin"
      params['selection'] = "Admin selection"
    else
      params['selection'] = "User voting"

    params['is_active'] = true
    if lab['pending']
      params['is_active'] = false
      params['is_pending'] = true
      # JEEFIX - hack : need to figure out a way to categorize expert labs
      params['is_expert_pending'] = parseInt(lab['pending']) == 2
    else if lab['winner']
      params['is_active'] = false
      params['is_archive'] = true

    if page['my_votes']?
      params['my_votes'] = page['my_votes']
    else
      params['my_votes'] = 0

    if page['sum_picks']?
      sum_picks = parseInt(page['sum_picks'])
    else
      sum_picks = 0

    if lab['uid'] is page['uid']
      params['lab_founder'] = true
    else
      params['lab_founder'] = false

    params['has_conclusion'] = false
    params['conclusion'] = ''
    if lab['conclusion'] != null
      params['has_conclusion'] = true
      params['conclusion'] = lab['conclusion']

    # calculate numbers
    params['num_slots'] = 0
    params['recent_round_num_slots'] = 0
    params['num_solutions'] = 0
    params['recent_round_num_solutions'] = 0
    params['submitted'] = 0
    params['recent_round_submitted'] = 0
    params['num_synthesized'] = 0
    params['recent_round_num_synthesized'] = 0

    # histories are the JSON array of round & puzzle
    histories = lab['puzzles']
    for ii in [0..histories.length-1]
      history = histories[ii]
      round = history['round']
      puzzles = history['puzzles']

      for puzzle in puzzles
        params['num_slots'] += puzzle['num_slots']
        params['num_solutions'] += puzzle['num_solutions']
        params['submitted'] += puzzle['submitted']
        params['num_synthesized'] += puzzle['num_synthesized']
        if ii == histories.length-1
          params['recent_round_num_slots'] += puzzle['num_slots']
          params['recent_round_num_solutions'] += puzzle['num_solutions']
          params['recent_round_submitted'] += puzzle['submitted']
          params['recent_round_num_synthesized'] += puzzle['num_synthesized']

    params['slots_left'] = params['recent_round_num_slots'] - sum_picks
    params['nid'] = lab['nid']
    params['secstruct'] = lab['puzzles'][0]['secstruct']
    params['title'] = lab['title']
    params['body'] = EternaUtils.format_body(lab['body'])
    params['thumbnail'] = EternaUtils.get_puzzle_middle_thumbnail(lab['nid'])
    params['date'] = lab['date']
    params['submitted'] = lab['last_round_submitted']
    params['round'] = lab['round']
    params['comments'] = page['comments']
    params['supercomments'] = page['supercomments']
    params['voted'] = lab['voted']

    project_puzzles = lab['puzzles']
    if lab['cover_image']?
      params['cover_image'] = lab['cover_image']
    else
      params['cover_image'] = EternaUtils.get_puzzle_middle_thumbnail(project_puzzles[0]['puzzles'][0]['nid'])
    params['uid'] = lab['uid']

    current_round_states = project_puzzles[project_puzzles.length-1]

    states = {}
    states['is_active'] = params['is_active']
    states['is_pending'] = params['is_pending']
    states['is_expert_pending'] = params['is_expert_pending']
    states['is_expert'] = params['is_expert']
    states['affiliation_url'] = params['affiliation_url']
    states['affiliation'] = params['affiliation']
    states['num_slots'] = params['recent_round_num_slots']
    states['selection'] = params['selection']
    states['logged_in'] = params['logged_in']
    states['my_votes'] = params['my_votes']
    states['num_solutions'] = params['num_solutions']
    states['lab_founder'] = params['lab_founder']
    states['slots_left'] = params['slots_left']
    states['num_synthesized'] = params['recent_round_num_synthesized']
    states['submitted'] = params['recent_round_submitted']
    if (lab['coadmin_names'])
      states['coadmin_names'] = lab['coadmin_names'].join(", ")
    if (lab['username'])
      states['admin_name'] = lab['username']

    params['states'] = JSON.stringify(states)
    return params

  draw_target_structure : ($target_notation, switch_struct_data, secstruct, nid) ->
    notation_block = Blocks("target-notation")
    if switch_struct_data
      for ii in [0..switch_struct_data.length-1] by 1
        notation_block.add_block($target_notation, {secstruct:switch_struct_data[ii]})
      for ii in [0..switch_struct_data.length-1] by 1
        id = "shape_"+ii+"_"+nid
        $target_notation.append('<div id="'+id+'" style="width:40%;"></div>')
        if $shape = $target_notation.find("#"+id)
          EternaUtils.draw_secstructure(switch_struct_data[ii], $shape, null, null, null)
          $shape.css('float','left')
    else
      notation_block.add_block($target_notation, {secstruct: secstruct})
      id = "shape_"+nid
      $target_notation.append('<div id="'+id+'"></div>')
      if $shape = $target_notation.find("#"+id)
        EternaUtils.draw_secstructure(secstruct, $shape, null, null, null)

  show_follow : () ->
    if $follow = @get_element("follow")
      $follow.show()
    if $unfollow = @get_element("unfollow")
      $unfollow.hide()

  show_unfollow : () ->
    if $follow = @get_element("follow")
      $follow.hide()
    if $unfollow = @get_element("unfollow")
      $unfollow.show()

  hide_follows : () ->
    if $follow = @get_element("follow")
      $follow.hide()
    if $unfollow = @get_element("unfollow")
      $unfollow.hide()

  show_save_conclusion : () ->
    if $save_conclusion = @get_element("div-save-conclusion")
      $save_conclusion.show()

  hide_save_conclusion : () ->
    if $save_conclusion = @get_element("div-save-conclusion")
      $save_conclusion.hide()

  show_edit_conclusion : () ->
    if $edit_conclusion = @get_element("div-display-conclusion")
      $edit_conclusion.show()

  hide_edit_conclusion : () ->
    if $edit_conclusion = @get_element("div-display-conclusion")
      $edit_conclusion.hide()

class @BuilderLabProjectRound extends Builder
  on_build : (block, $container, params) ->
    states = JSON.parse(params['states'])
    ThemeCompiler.compile_block(block,params,$container)
    if $project_round_puzzles = @get_element("project_round_puzzles")
      puzzles = params['puzzles']
      block = Blocks("project-puzzle-block")
      $slide_div = $('<div style="float:left;"></div>')
      for ii in [0..puzzles.length-1]
        block_params = {}
        block_params['num'] = ii
        puzzle = puzzles[ii]
        block_params['nid'] = puzzle['nid']
        block_params['title'] = puzzle['title']
        if puzzle['num_slots'] then block_params['num_slots'] = puzzle['num_slots']
        else block_params['num_slots'] = 0
        block_params['thumbnail'] = EternaUtils.get_puzzle_middle_thumbnail(puzzle['nid'])
        block_params['states'] = JSON.stringify(states)
        block_params['round'] = params['round']
        block_params['postfix'] = puzzle['nid'] + params['round']
        block_params['is_active'] = states['is_active']
        block_params['is_pending'] = states['is_pending']
        block_params['is_expert'] = states['is_expert']
        block_params['is_playable'] = params['is_playable']
        block.add_block($slide_div, block_params)
        if !((ii+1)%3) or (ii is puzzles.length-1)
          $project_round_puzzles.append($slide_div)
          $slide_div = $('<div style="float:left;"></div>')


class @BuilderLabPageInfo extends Builder
  on_build : (block, $container, params) ->
    info = JSON.parse(params['states'])
    params['is_expert'] = info['is_expert']
    params['affiliation_url'] = info['affiliation_url']
    params['affiliation'] = info['affiliation']
    params['is_pending'] = info['is_pending']
    params['num_slots'] = info['num_slots']
    params['selection'] = info['selection']
    params['is_active'] = info['is_active']
    params['logged_in'] = info['logged_in']
    params['my_votes'] = info['my_votes']
    params['num_solutions'] = info['num_solutions']
    params['slots_left'] = info['slots_left']
    params['num_synthesized'] = info['num_synthesized']
    params['submitted'] = info['submitted']
    params['coadmin_names'] = info['coadmin_names']
    params['admin_name'] = info['admin_name']
    ThemeCompiler.compile_block(block,params,$container)


class @BuilderLabPageEdit extends Builder
  on_build : (block, $container, params) ->
    nid = params['nid']

    PageData.get_lab(nid, (page) =>
      params = BuilderLabPage.prototype.parse_state(page, params)

      lab = page['lab']

      if lab['uid'] != Application.CURRENT_USER['uid']
        Utils.display_error("You can't edit this lab project")
        return

      params['title'] = lab['title']
      params['body'] = EternaUtils.format_body(lab['body'])
      params['submitted'] = lab['submitted']
      if lab['email']
        params['email'] = lab['email']
      if lab['affiliation']
        params['affiliation'] = lab['affiliation']

      history = lab['puzzles']
      recent_round_puzzles = history[history.length-1]['puzzles']
      recent_puzzle = recent_round_puzzles[0]
      params['puz_nid'] = recent_puzzle['nid']

      params['previous_labs'] = lab
      ThemeCompiler.compile_block(block,params,$container)

      if $labedit = @get_element("cloud-lab-edit")
        $labedit.click(()=>
          if confirm("Are you sure want to update your project?")
            title = @get_element("title").val()
            body = @get_element("project-body").val()
            if @get_element("email") and email = @get_element("email").attr("value")
              if Utils.is_text_empty(email)
                Utils.display_error("Please enter email")
                return
              else
                if !( (/([^@]+@.+)/i).exec(email) )
                  Utils.display_error("Invalid email input")
                  return

            if @get_element("affiliation") and affiliation = @get_element("affiliation").attr("value")
              if Utils.is_text_empty(affiliation)
                Utils.display_error("Please enter your affiliation")
                return

            if !(title?) or title == ""
              alert "Please enter title"
              return

            if !(body?) or body == ""
              alert "Please enter description"
              return

            #serialize datas
            data = BuilderLabPuzzleModify.prototype.serialize_datas()

            if data.length == 0
              Utils.display_error("You should add at least one puzzle")
              return

            post_data = new Array()
            # remove unused data
            for ii in [0..data.length-1]
              if data[ii]['use'] != undefined and data[ii]['use'] == "checked"
                post_data.push(data[ii])

            # at least one puzzle is needed
            if !post_data.length
              Utils.display_error("You should add at least one puzzle")
              return

            @get_element("form-data").attr("value",JSON.stringify(post_data))
            if $form = @get_element("cloud-lab-edit-form")
              #alert JSON.stringify($form.serializeArray())
              $form.submit()
        )
    )

class @BuilderLabPuzzleModify extends Builder
  puzzle_num = 0
  on_build : (block, $container, params) ->
    ThemeCompiler.compile_block(block,params,$container)

    # initialize flash browser
    swfobject.embedSWF(Utils.get_lab_flash_filename(), "lab-propose-puzzle-maker", "640", "640", "10", null, {dummyval:"dummy", inputtype:"PUZZLEMAKER_EMBEDDED"}, {wmode:"transparent", allowscriptaccess:"always"}, {wmode:"transparent", allowscriptaccess:"always", id:"lab-propose-puzzle-maker", name:"lab-propose-puzzle-maker"})

    # show previous puzzles
    if previous_labs = params['previous_labs']
      if previous_labs != "{previous_labs}"
        @initialize_previous_labs(previous_labs)

    # puzzle addition
    if $cloud_lab_add = @get_element("cloud-lab-add")
      $cloud_lab_add.click(()=>
        if $lab_propose_new_puzzles = @get_element("lab-propose-puzzles")
          flash = document.getElementById("lab-propose-puzzle-maker")
          secstruct = flash.get_secstruct()
          sequence = flash.get_sequence()
          locks = flash.get_locks()
          #shift_locks = flash.get_shift_locks()
          #shift_limit = flash.get_shift_limit()
          thumbnail = flash.get_thumbnail()


          title = @get_element("lab-new-puzzle-title").attr('value')
          num_synthesis = @get_element("num_synthesis_input").attr("value")
          gus = @get_element("gus-input").attr("value")
          gcs = @get_element("gcs-input").attr("value")
          aus = @get_element("aus-input").attr("value")
          mutation_limit = @get_element("mutation-limit-input").attr("value")

          if isNaN(gus) then gus = undefined
          if isNaN(gcs) then gcs = undefined
          if isNaN(aus) then aus = undefined
          if isNaN(mutation_limit) then mutation_limit = mutation_limit

          if Utils.is_text_empty(title)
            Utils.display_error("Please enter title")
            return

          if isNaN(num_synthesis)
            Utils.display_error("Invalid number of synthesis slots. Please use 1 or bigger")
            return

          if parseInt(num_synthesis) == 0
            Utils.display_error("Invalid number of synthesis slots. Please use 1 or bigger")
            return

          # since thumbnail data is base64 encoded
          cover_image = "data:image/png;base64,"+thumbnail

          block = Blocks("lab-puzzle-small-block")
          #block.add_block($lab_propose_new_puzzles, {puznid:"", puzzle_num:puzzle_num, title:title, secstruct:secstruct, sequence:sequence, locks:locks, shift_locks:shift_locks, shift_limit:shift_limit, thumbnail:thumbnail, cover_image:cover_image, num_synthesis:num_synthesis, gus:gus, gcs:gcs, aus:aus, mutation_limit:mutation_limit})
          block.add_block($lab_propose_new_puzzles, {puznid:"", puzzle_num:puzzle_num, title:title, secstruct:secstruct, sequence:sequence, locks:locks, thumbnail:thumbnail, cover_image:cover_image, num_synthesis:num_synthesis, gus:gus, gcs:gcs, aus:aus, mutation_limit:mutation_limit})
          puzzle_num++
          @get_element("lab-new-puzzle-title").attr('value','')
      )

  initialize_previous_labs : (lab)->
    #setup previous puzzles
    histories = lab['puzzles']
    last_round_puzzles = histories[histories.length-1]['puzzles']
    if $formal_puzzles = @get_element("lab-propose-puzzles")
      block = Blocks("lab-puzzle-small-block")
      for formal_puzzle in last_round_puzzles

        # parse constraints
        if constraints = formal_puzzle['constraints']
          constraints = constraints.split(",")
          for ii in [0..constraints.length-1]
            if constraints[ii] == "GU" then formal_puzzle['gus'] = constraints[ii+1]
            if constraints[ii] == "GC" then formal_puzzle['gcs'] = constraints[ii+1]
            if constraints[ii] == "AU" then formal_puzzle['aus'] = constraints[ii+1]
            if constraints[ii] == "MUTATION" then formal_puzzle['mutation_limit'] = constraints[ii+1]
        formal_puzzle['puznid'] = formal_puzzle['nid']
        formal_puzzle['num_synthesis'] = formal_puzzle['num_slots']
        formal_puzzle['cover_image'] = EternaUtils.get_puzzle_middle_thumbnail(formal_puzzle['nid'])
        block.add_block($formal_puzzles, formal_puzzle)
        puzzle_num++

  serialize_datas : () ->
    #serialize added puzzle datas
    data = new Array()
    $('#lab-propose-puzzles').find('tr').each((index, element) =>
      id = $(element).attr('id')
      row = {}
      $(element).find('input').each((i, e) =>
        if $(e).attr('id') == "use" then row["use"] = $(e).attr('checked')
        else row[$(e).attr('id')] = $(e).val()
      )
      data.push(row)
    )
    return data



class @BuilderStrategies extends Builder
  on_build : (block ,$container, params) ->
    PageData.get_strategies((page) =>
      strategies = page['strategies']
      ThemeCompiler.compile_block(block,params,$container)

      if $strategies = @get_element("strategies")
        for ii in [0..strategies.length-1] by 1
          strategies[ii]['picture'] = EternaUtils.get_user_picture(strategies[ii]['picture'])
        packer = Packers($strategies)
        packer.add(strategies)

      if $readmore = @get_element("read-more")
        if $readmore_parent = @get_element("read-more-parent")
          if $readmore_content = @get_element("read-more-content")
            $readmore.click(() =>
              $readmore_content.show()
            )
    )

class @BuilderLabVoter extends Builder
  on_build : (block ,$container, params) ->
    $container.html("")
    ThemeCompiler.compile_block(block,params,$container)

    if $button = @get_element("button")
      nid = params['nid']
      if params['voted'] == "VOTED"
        $button.click(() =>
          Overlay.set_loading()
          Overlay.show()
          PageData.delete_project_vote(nid, (data) =>
            Overlay.hide()
            params['voted'] = false
            @on_build(block, $container, params)
            if $num_voters = @get_element("num_voters")
              if data['num_voters'] then $num_voters.html(data['num_voters'])
          , () =>
            Overlay.hide()
            Utils.display_error("Vote failed - please try again later!")
          )
        )
      else
        $button.click(() =>
          Overlay.set_loading()
          Overlay.show()
          PageData.post_project_vote(nid, (data) =>
            Overlay.hide()
            params['voted'] = "VOTED"
            @on_build(block, $container, params)
            if $num_voters = @get_element("num_voters")
              if data['num_voters'] then $num_voters.html(data['num_voters'])
          , () =>
            Overlay.hide()
            Utils.display_error("Vote failed - please try again later!")
          )
        )


class @BuilderExpertLabProposeSequences extends Builder
  on_build : (block ,$container, params) ->
    project_type = params['project_type']
    ThemeCompiler.compile_block(block,params,$container)

    if !(Application.CURRENT_USER?)
      Utils.display_error("Warning : You are not logged in - you won't be able to submit your proposal!")

    if $gen_mutation = @get_element("gen-mutation-map")
      $gen_mutation.click(() =>
        sequence = prompt("Please enter the sequence, secondary structure and title")
        if sequence != ""
          seq_match = sequence.split(/\s+/)
          if seq_match[0]
            map = EternaUtils.generate_mutation_map(seq_match[0])
            if $sequences = @get_element("sequences")
              tmp_seq = $sequences.attr("value")
              for ii in [0..map['map'].length-1] by 1
                tmp_seq += map['map'][ii]+"\t"+seq_match[1]+"\t"+seq_match[2]+"-"+map['title'][ii]+"\n"
              $sequences.val(tmp_seq)
      )

    if $submit = @get_element("cloud-lab-submit")
      $submit.click(() =>
        title = @get_element("title").attr("value")
        body = @get_element("project-body").attr("value")
        sequences = @get_element("sequences").attr("value")
        email = @get_element("email").attr("value")
        affiliation = @get_element("affiliation").attr("value")

        if Utils.is_text_empty(title)
          Utils.display_error("Please enter title")
          return

        if secstruct?
          if (/[^\(\.\)]/).exec(secstruct)
            Utils.display_error("Wrong secondary structure - only use ( . )")
            return

        if Utils.is_text_empty(sequences)
          Utils.display_error("Please enter the sequences")
          return

        sequences_array = sequences.split('\n')
        new_sequences_array = []

        for seq_string in sequences_array
          ne_match = (/[^\s\n]+/).exec(seq_string)

          if !(ne_match?)
            continue

          seq_string = seq_string.replace(/\n/g, "")
          seq_string = seq_string.replace(/\r/g, "")
          seq_match = (/^([^\s]+)\s+([^\s]+)\s+([^\n]+)\n?$/i).exec(seq_string)

          if !(seq_match?)
            Utils.display_error("Wrong sequence/secstruct/title format " + seq_string + ".")
            return

          seq = seq_match[1]
          sec = seq_match[2]
          title = seq_match[3]

          if (/([^AUGCT])/gi).exec(seq)
            Utils.display_error("Your sequence " + seq + " has a letter other than AUCGT")
            return

          if !(seq?)
            Utils.display_error("Wrong sequence format")
            return

          if !(title?)
            Utils.display_error("Wrong title format")
            return
          if !(sec?)
            Utils.display_error("Wrong secstruct format")
            return
          if (/[^\(\.\)]/).exec(sec)
            Utils.display_error("Your secstruct " + sec + " has a letter other than ( ) . ")
            return

          if seq.length > 110
            Utils.display_error("You can't have sequences with lengths more than 110")
            return

          new_sequences_array.push(seq_string)

        @get_element("sequences").attr("value", new_sequences_array.join("\n"))
        if Utils.is_text_empty(title)
          Utils.display_error("Please enter the project title")
          return

        if Utils.is_text_empty(body)
          Utils.display_error("Please enter the project body")
          return
        Overlay.set_loading()
        Overlay.show()

        if !(Application.CURRENT_USER?)
          Utils.display_error("You must be logged in to submit a proposal")
          return
        @get_element("cloud-lab-form").submit()
      )

  validate_sequence : (sequences) ->
    if Utils.is_text_empty(sequences)
      Utils.display_error("Please enter the sequences")
      return

    sequences_array = sequences.split('\n')
    new_sequences_array = []
    new_sequences_json_array = []

    for seq_string in sequences_array
      ne_match = (/[^\s\n]+/).exec(seq_string)

      if !(ne_match?)
        continue

      seq_string = seq_string.replace(/\n/g, "")
      seq_string = seq_string.replace(/\r/g, "")
      seq_match = (/^([^\s]+)\s+([^\s]+)\s+([^\n]+)\n?$/i).exec(seq_string)

      if !(seq_match?)
        Utils.display_error("Wrong sequence/secstruct/title format " + seq_string + ".")
        return

      seq = seq_match[1]
      sec = seq_match[2]
      title = seq_match[3]

      if (/([^AUGCT])/gi).exec(seq)
        Utils.display_error("Your sequence " + seq + " has a letter other than AUCGT")
        return

      if !(seq?)
        Utils.display_error("Wrong sequence format")
        return

      if !(title?)
        Utils.display_error("Wrong title format")
        return
      if !(sec?)
        Utils.display_error("Wrong secstruct format")
        return
      if (/[^\(\.\)]/).exec(sec)
        Utils.display_error("Your secstruct " + sec + " has a letter other than ( ) . ")
        return

      if seq.length > 110
        Utils.display_error("You can't have sequences with lengths more than 90")
        return
      new_sequences_array.push(seq_string)
      new_sequences_json_array.push({sequence:seq, secstruct:sec, title:title})

    return {array:new_sequences_array, json:new_sequences_json_array}

class @BuilderExpertLabProposePuzzle extends Builder
  on_build : (block ,$container, params) ->
    project_type = params['project_type']
    ThemeCompiler.compile_block(block,params,$container)

    if $submit = @get_element("cloud-lab-submit")
      $submit.click(() =>
        title = @get_element("title").attr("value")
        body = @get_element("project-body").attr("value")
        email = @get_element("email").attr("value")
        affiliation = @get_element("affiliation").attr("value")

        if Utils.is_text_empty(title)
          Utils.display_error("Please enter title")
          return

        if Utils.is_text_empty(body)
          Utils.display_error("Please enter body")
          return

        #serialize datas
        data = BuilderLabPuzzleModify.prototype.serialize_datas()


        if data.length == 0
          Utils.display_error("You should add at least one puzzle")
          return

        post_data = new Array()
        # remove unused data
        for ii in [0..data.length-1]
          if data[ii]['use'] != undefined and data[ii]['use'] == "checked"
            post_data.push(data[ii])

        # at least one puzzle is needed
        if !post_data.length
          Utils.display_error("You should add at least one puzzle")
          return

        if $form_data = @get_element("form-data")
          $form_data.val(JSON.stringify(post_data))

        #alert JSON.stringify(@get_element("cloud-lab-form").serializeArray())
        if script_nid = @get_element("script").val()
          Script.get_script(script_nid, (data)=>
            script = data['script']
            if script.length > 0
              @get_element("cloud-lab-form").submit()
            else
              alert "Please check script nid"
          )
        else
          @get_element("cloud-lab-form").submit()

      )

class @BuilderExpertLabSimple extends Builder
  on_build : (block ,$container, params) ->
    ThemeCompiler.compile_block(block,params,$container)

    if $delete = @get_element("cloud-delete")
      $delete.click(() =>
        Overlay.set_loading()
        Overlay.show()
        PageData.delete_cloud_lab(params['nid'], () =>
          Utils.reload()
        )
      )


class @BuilderProjectAddCoadmin extends Builder
  on_build : (block, $container, params) ->
    ThemeCompiler.compile_block(block,params,$container)

    $name = @get_element("name");
    $add = @get_element("add");
    $remove = @get_element("remove");

    $add.click(() =>
      Overlay.set_loading("")
      Overlay.show()
      PageData.add_project_coadmin(params['nid'], $name.attr("value"), (data) =>
        if data['success']
          Utils.reload()
        else
          Utils.display_error(data['error'])
          Overlay.hide()
      )
    )

    $remove.click(() =>
      Overlay.set_loading("")
      Overlay.show()
      PageData.remove_project_coadmin(params['nid'], $name.attr("value"), (data) =>
        if data['success']
          Utils.reload()
        else
          Utils.display_error(data['error'])
          Overlay.hide()
      )
    )

class @BuilderLabsSequenceCollection extends Builder
  on_build : (block ,$container, params) ->
    ThemeCompiler.compile_block(block,params,$container)

    PageData.get_labs_for_collection(params, (page) =>
    #PageData.get_labs_for_tracker(params, (page) =>
      labs = page['labs']

      $additional_sequences = @get_element("lab-additional-sequences")
      if $paper_labs = @get_element("paper-labs")
        packer = Packers($paper_labs)
        packer.add(labs)

      if $collect_sequences = @get_element("submit-lab-collection")
        $collect_sequences.click(() =>
          #Overlay.set_loading("replying...")
          #Overlay.show()
          PageData.get_sequences_for_collection(params, (data) =>
            #only works in chrome
            $sequences = data['labs'] + $additional_sequences.attr("value");
            $repeat_sequences = $sequences;
            $i = $sequences.length - $sequences.replace(/\n/g,"").length;
            $repeat_i = $i;
            while ($repeat_i + $i < 12472)
              $repeat_sequences = $repeat_sequences + $sequences;
              $repeat_i = $repeat_i + $i;
            $i = (12472 - $repeat_i) * 151;
            pom = document.createElement('a')
            pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent($repeat_sequences) + encodeURIComponent($sequences.substring(0,$i)));
            pom.setAttribute('download', 'Order.txt');
            pom.click();
            #uri = 'data:application/csv;charset=UTF-8,test';
            #uri = 'data:application/csv;charset=UTF-8,' + encodeURIComponent("test");
            #window.open(uri);
          )
          #Overlay.hide()
          #query_params = {type:"get_sequences_for_collection"}
          #url = Application.GET_URI
          #AjaxManager.query("GET", url, query_params)
          #alert "jntest"
        )

      if $collect_sequence_file = @get_element("submit-lab-collection-file")
        $collect_sequence_file.click(() =>
          PageData.get_sequence_data_for_collection(params, (data) =>
            #only works in chrome
            $sequences = data['labs'];
            pom = document.createElement('a')
            pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent($sequences));
            pom.setAttribute('download', 'Sequence.txt');
            pom.click();
          )
        )
    )

class @BuilderLabSequenceCollection extends Builder
  on_build : (block ,$container, params) ->
    input_params = {}
    #input_params['title'] = 'Thermodynamic Mimics Round 3'
    #input_params['author'] = 'brourd'
    #input_params['slots'] = '40'
    #input_params['designs'] = '37'
    input_params['title'] = params['title']
    input_params['author'] = params['author']
    input_params['slots'] = params['slots']
    input_params['designs'] = params['designs']
    ThemeCompiler.compile_block(block,input_params,$container)




class @BuilderLabCardsMap extends Builder


  $lab_cards_map_ = null
  processing_ = true
  labs_ = []
  cards_ = []

  on_build : (block, $container, params) ->

    if Application.CURRENT_USER
      params['uid'] = Application.CURRENT_USER['uid']

    cards_type = null
    if params['cards_type']?
      cards_type = params['cards_type']
    params['cards_type'] = cards_type

    ThemeCompiler.compile_block(block,params,$container)

    $lab_cards_map_ = @get_element("lab-cards-map")
    if !($lab_cards_map_?)
      return

    if params['cards_type']? and params['cards_type'] == 'my_lab_cards'
      @build_my_lab_cards(block, $container, params)
    else if params['mode']? and params['mode'] == 'lazy'
      @build_lab_cards_lazy(block, $container, params)
    else
      @build_lab_cards(block, $container, params)


  build_my_lab_cards : (block, $container, params) ->
    pageindex = 0
    params['size'] = 6
    status = @load_lab_cards_lazy(params, pageindex)


  build_lab_cards_lazy : (block, $container, params) ->

    pageindex = 0

    status = @load_lab_cards_lazy(params, pageindex)

    this2 = this
    $(window).scroll(() ->
      if processing_ is false
        if($(window).scrollTop() == $(document).height() - $(window).height())
          status = this2.load_lab_cards_lazy(params, ++pageindex)
    )


  build_lab_cards : (block, $container, params) ->

    pageindex = 0

    status = @load_lab_cards_lazy(params, pageindex)
    status = @preprocess_lab_cards(params, ++pageindex)

    this2 = this
    $(window).scroll(() ->

      if processing_ is false
        if($(window).scrollTop() == $(document).height() - $(window).height())
          status = this2.load_lab_cards(pageindex)
          status = this2.preprocess_lab_cards(params, ++pageindex)

      this2.fade_in_lab_cards(params)

    )


  init_params : (params, pageindex) ->
    size = 18
    if params['size']?
      size = params['size']
    params['size'] = size
    params['skip'] = size * pageindex
    return params


  format_lab_cards : () ->
    card_titles = $(".lab-card-title")
    for title in card_titles
      fs = parseInt($(title).css('font-size'))
      if $(title).height() > 34.0
        $(title).css('line-height', 17+'px')
        while $(title).height() > 34.0 and fs > 0
          $(title).css('font-size', (--fs)+"px")
        $(title).css('line-height', (fs+2)+'px')
        $(title).css('margin-top', (15-fs)+'px')


  fade_in_lab_cards : (params, on_enter = true) ->
    speed = 300
    if params['fade']?
      speed = params['fade']
    offset = 245
    if params['offset']?
      offset = parseInt(params['offset'])
    if !on_enter
      for card in cards_
        do ->
          $(card).fadeTo(speed, 1)
    for card in cards_
      do ->
        a = $(card).offset().top + $(card).height() - offset
        b = $(window).scrollTop() + $(window).height()
        if a < b
          $(card).fadeTo(speed, 1)


  fade_out_lab_cards : () ->
    cards = $(".mini-lab-cards-map")
    if cards.length > cards_.length
      start = cards_.length
      index = -1
      for card in cards
        ++index
        if index < start
          continue
        $(card).fadeTo(0, 0)
        cards_.push(card)


  load_lab_cards : (pageindex) ->

    if !(labs_?) or !(labs_.length > 0)
      return false

    @set_processing(pageindex, true)

    # display labs in lab cards map
    packer = Packers($lab_cards_map_)
    packer.add(labs_)

    @format_lab_cards()
    @fade_out_lab_cards()

    @set_processing(pageindex, false)
    return true


  preprocess_lab_cards : (params, pageindex) ->

    params = @init_params(params, pageindex)

    # process labs for lab cards
    @set_processing(pageindex, true)
    PageData.get_labs_for_lab_cards(params, (page) =>
      labs_ = (@parse_lab(lab) for lab in page['labs'])
      if pageindex != 1 or (params['mode']? and params['mode'] == 'lazy')
        @set_processing(pageindex, false)
    )
    return true


  load_lab_cards_lazy : (params, pageindex) ->

    params = @init_params(params, pageindex)

    # process labs for lab cards
    @set_processing(pageindex, true)
    PageData.get_labs_for_lab_cards(params, (page) =>
      labs = (@parse_lab(lab) for lab in page['labs'])
      @set_processing(pageindex, false)

      # display labs in lab cards map
      packer = Packers($lab_cards_map_)
      packer.add(labs)

      @fade_out_lab_cards()

      if params['cards_type'] == 'my_lab_cards'
        if !labs or labs.length < 1
          if $lab_cards_panel = @get_element('lab-cards-panel')
            $lab_cards_panel.hide()
          if $lab_member_panel = @get_element('lab-member-panel')
            $lab_member_panel.css({'margin-top':'-11px'})
        @fade_in_lab_cards(params, on_enter = false)
      else
        @fade_in_lab_cards(params)

      @format_lab_cards()

    )
    return true


  parse_lab : (lab) ->

    lab['is_expert'] = lab['affiliation'] != null

    if !(lab['cover_image']?)
      try
        lab['cover_image'] = EternaUtils.get_puzzle_middle_thumbnail(lab['puzzles'][0]['puzzles'][0])
    if lab['selection'] == "admin"
      lab['selection'] = "Admin selection"
    else
      lab['selection'] = "User voting"

    show_exp_counts = false
    if show_exp_counts
      if !(lab['num_slots']?)
        lab['num_slots'] = 0

      if !(lab['num_solutions']?)
        lab['num_synthesized'] = 0

      if !(lab['submitted']?)
        lab['submitted'] = 0

      if !(lab['num_synthesized']?)
        lab['num_synthesized'] = 0


    if !(lab['exp_phase'])? or parseInt(lab['exp_phase']) < 1
      lab['exp_phase'] = 5

    #######################################
    # NOTE: for dev server testing only!!!
    #######################################
    #if lab['nid'] not in ['3399164', '3398936']
    #  lab['exp_phase'] = 5

    nid = lab['nid']
    exp_phase = lab['exp_phase']

    exp_statuses = [
      "Accepting Submissions",
      "Ordering DNA Templates",
      "Synthesizing RNA",
      "Getting Data",
      "Results Posted"
    ]
    lab['exp_status'] = exp_statuses[exp_phase-1]
    lab['link'] = "/web/lab/"+nid+"/"
    lab['verb'] = "Enter"

    if lab['puz_nid']? and lab['user_name']?
      #lab['link'] = "/web/labs/data-browser/?project_id=id&designer=name"
      lab['link'] = "/web/browse/"+lab['nid']+"/?Designer="+lab['user_name']
      if exp_phase < 5
        lab['verb'] = "Review Designs" #Review
      else
        lab['verb'] = "Browse Results" #Browse

    return lab


  set_processing : (pageindex, status) ->

    $processing_labs0 = @get_element("processing-labs-0")
    $processing_labs1 = @get_element("processing-labs-1")

    if status == true
      $processing_labs1.show()
    else
      $processing_labs1.hide()

    processing_ = status
