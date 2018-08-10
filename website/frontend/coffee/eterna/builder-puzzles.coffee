class @BuilderPuzzlePage extends Builder
  on_build : (block, $container, params) ->

    nid = params['nid']

    if !(nid?)
      Utils.display_error("nid not specified")
      return

    Application.track_google_analytics_event("puzzle","open", "");
    PageData.get_puzzle(nid, (page)=>
      @process_pagebuild(block, $container, params, nid, page)
      )

  process_pagebuild : (block, $container, params, nid, page) ->
      puzzle = page['puzzle']
      cleared = page['cleared']
      input_params = {}
      input_params['nid'] = nid
      input_params['title'] = puzzle['title']
      input_params['thumbnail'] = EternaUtils.get_puzzle_middle_thumbnail(puzzle['id'])
      input_params['num_cleared'] = if puzzle['num-cleared']? then puzzle['num-cleared'] else 0
      input_params['reward'] = puzzle['reward']
      input_params['body'] = EternaUtils.format_body(puzzle['body'])
      input_params['comments'] = page['comments']
      input_params['created'] = puzzle['created']

      if Application.CURRENT_USER?
        input_params['can_modify'] = (Application.CURRENT_USER['uid']==puzzle['uid'])

      if cleared?
        for ii in [0..cleared.length-1] by 1
          if cleared[ii]['nid'] == nid
            input_params['cleared'] = true
            break

      if is_player_puzzle = (parseInt(puzzle['made-by-player']) > 0)

        input_params['is_player_puzzle'] = is_player_puzzle
        solved_by_bot = puzzle['solved-by-bot']
        input_params['username'] = puzzle['username']
        input_params['userpicture'] = EternaUtils.get_user_picture(puzzle['userpicture'])

        if false # solved_by_bot
          if (/InfoRNA_/i).exec(solved_by_bot)
            if (/InfoRNA_failure/i).exec(solved_by_bot) ||  (/InfoRNA_timeout/i).exec(solved_by_bot)
              input_params["failed_by_inforna"] = true
            else
              input_params["solved_by_inforna"] = true

          if (/ViennaRNA_/i).exec(solved_by_bot)
            if (/ViennaRNA_failure/i).exec(solved_by_bot) ||  (/ViennaRNA_timeout/i).exec(solved_by_bot)
              input_params["failed_by_vienna"] = true
            else
              input_params["solved_by_vienna"] = true

          if (/RNASSD_/i).exec(solved_by_bot)
            if (/RNASSD_failure/i).exec(solved_by_bot) ||  (/RNASSD_timeout/i).exec(solved_by_bot)
              input_params["failed_by_rnassd"] = true
            else
              input_params["solved_by_rnassd"] = true

      ThemeCompiler.compile_block(block,input_params,$container)
      if $structure_notation = @get_element("structure_notation")
        notation_block = Blocks("notation")
        if puzzle['switch_struct']
          switch_struct_data = puzzle['switch_struct']
          for ii in [0..switch_struct_data.length-1] by 1
            notation_block.add_block($structure_notation, {secstruct: switch_struct_data[ii]})
          for ii in [0..switch_struct_data.length-1] by 1
            $structure_notation.append('<div id="shape-'+ii+'"></div>');
            if $shape = @get_element("shape-"+ii)
              #EternaUtils.draw_secstructure(switch_struct_data[ii], $shape, null, null, null)
              $sec_struct = switch_struct_data[0]
        else
            notation_block.add_block($structure_notation, {secstruct: puzzle['secstruct']})
            $structure_notation.append('<div id="shape"></div>');
            if $shape = @get_element("shape")
              #EternaUtils.draw_secstructure(puzzle['secstruct'], $shape, null, null, null)
              $sec_struct = puzzle['secstruct']

      if Application.CURRENT_USER['uid'] in ["48166", "130245", "158495"]
        @show_create_image()

      if $create_image = @get_element("create_image")
        $create_image.click(() =>
          Overlay.set_loading("creating..")
          Overlay.show()
          PageData.create_puzzle_image(nid, $sec_struct, (data)=>
            if data['success'] == false
              alert "Create image fail!"
            else
              alert "Image created!"
            )
          Overlay.hide()
          )


      # There's currently no easier way to get to the tutorial, so we want the button always on when you can edit a tutorial
      # (The latter part is handled in the template)
      ###
      if $tutorial_link = @get_element("tutorial-link")
        $tutorial_link.hide()
        PageData.get_puzzle_tutscripts(nid, (page) =>
          if page['tutscripts']?
            if page['tutscripts'][0]?
              $tutorial_link.show()
        )
      ###


      if page['follow']? && page['follow'][0]?
        input_params['is_already_followed'] = true
        @show_unfollow()
      else
        input_params['is_already_followed'] = false
        @show_follow()

      if $follow_puzzle = @get_element("follow_puzzle")
        $follow_puzzle.click(() =>
          Overlay.set_loading("replying..")
          Overlay.show()
          Follow.follow(nid, "node", null, (data) =>
            if data['success']
              @show_unfollow()
            else
              alert "Follow fail!!"
            Overlay.hide()
            )
          )
      if $unfollow_puzzle = @get_element("unfollow_puzzle")
        $unfollow_puzzle.click(() =>
          Overlay.set_loading("replying..")
          Overlay.show()
          Follow.expire_follow(nid, "node", (data) =>
            if data['success']
              @show_follow()
            else
              alert "Unfollow fail!!"
            Overlay.hide()
            )
          )
      if $run_script = @get_element("run_script")
        $run_script.click(()->
          block = Blocks("overlay-runscript")
          $overlay_slot = Overlay.get_slot("runscript")
          Overlay.load_overlay_content("runscript")
          Overlay.show()
          if block['template_context_variables_'] == null
            block.add_block($overlay_slot, {nid:input_params['nid'], secstruct:input_params['secstruct']})
          )

      if $playpuzzle = @get_element("playpuzzle")
        $playpuzzle.click(()=>
          Application.track_google_analytics_event("puzzle","play", "");
          Utils.redirect_to("/game/puzzle/"+input_params['nid'])
          )

  show_create_image : () ->
    if $create_image = @get_element("create_image")
      $create_image.show()

  show_follow : () ->
    if $follow_puzzle = @get_element("follow_puzzle")
      $follow_puzzle.show()
    if $unfollow_puzzle = @get_element("unfollow_puzzle")
      $unfollow_puzzle.hide()

  show_unfollow : () ->
    if $follow_puzzle = @get_element("follow_puzzle")
      $follow_puzzle.hide()
    if $unfollow_puzzle = @get_element("unfollow_puzzle")
      $unfollow_puzzle.show()

class @BuilderPuzzle extends Builder
  on_build : (block, $container, params) ->

    input_params = {}
    input_params['id'] = params['id']
    input_params['title'] = params['title']
    input_params['cleared'] = params['cleared']
    input_params['thumbnail'] = EternaUtils.get_puzzle_middle_thumbnail(params['id'])
    input_params['num_cleared'] = if params['num-cleared']? then params['num-cleared'] else 0
    input_params['reward'] = params['reward']
    input_params['play_direct'] = (params['type'] == "Basic" || params['type'] == "SwitchBasic")

    if is_player_puzzle = (parseInt(params['made-by-player']) > 0)

      input_params['is_player_puzzle'] = is_player_puzzle
      solved_by_bot = params['solved-by-bot']
      input_params['username'] = params['username']
      input_params['userpicture'] = EternaUtils.get_user_picture(params['userpicture'])

      if false # solved_by_bot
        if (/InfoRNA_/i).exec(solved_by_bot)
          if (/InfoRNA_failure/i).exec(solved_by_bot) ||  (/InfoRNA_timeout/i).exec(solved_by_bot)
            input_params["failed_by_inforna"] = true
          else
            input_params["solved_by_inforna"] = true

        if (/ViennaRNA_/i).exec(solved_by_bot)
          if (/ViennaRNA_failure/i).exec(solved_by_bot) ||  (/ViennaRNA_timeout/i).exec(solved_by_bot)
            input_params["failed_by_vienna"] = true
          else
            input_params["solved_by_vienna"] = true

        if (/RNASSD_/i).exec(solved_by_bot)
          if (/RNASSD_failure/i).exec(solved_by_bot) ||  (/RNASSD_timeout/i).exec(solved_by_bot)
            input_params["failed_by_rnassd"] = true
          else
            input_params["solved_by_rnassd"] = true

    ThemeCompiler.compile_block(block,input_params,$container)

class @BuilderPuzzles extends Builder

  on_build : (block, $container, params) ->

    type = params['type']
    skip = params['skip']
    size = params['size']
    sort = params['sort']
    search = params['search']

    if !(sort?)
      if type == "playerpuzzles"
        sort = params['sort'] = "date"
      else
        sort = params['sort'] = "reward"


    if !(skip?)
      skip = 0
    if !(size?)
      size = 24

    if type == "tutorials"
      PageData.get_tutorials((page) =>
        @build_puzzles(block, $container, params, page)
      )
    else if type == "switch-tutorials"
      PageData.get_switch_tutorials((page) =>
        @build_puzzles(block, $container, params, page)
      )

    else if type == "challenges"
      send_params = {}
      send_params['single'] = params['single']
      send_params['switch'] = params['switch']
      send_params['notcleared'] = params['notcleared']
      if params['notcleared']
        if Application.CURRENT_USER?
          send_params['uid'] = Application.CURRENT_USER['uid']
      PageData.get_challenges(skip, size, sort, search, send_params, (page)=>
        @build_puzzles(block, $container, params, page)
      )
    else if type == "playerpuzzles"
      send_params = {}
      send_params['single'] = params['single']
      send_params['switch'] = params['switch']
      send_params['vienna'] = params['vienna']
      send_params['rnassd'] = params['rnassd']
      send_params['inforna'] = params['inforna']
      send_params['notcleared'] = params['notcleared']
      if params['notcleared']
        if Application.CURRENT_USER?
          send_params['uid'] = Application.CURRENT_USER['uid']
      PageData.get_player_puzzles(skip, size, sort, search, send_params, (page) =>
        @build_puzzles(block, $container, params, page)
      )

    else if type == "progression"
      send_params = {}
      send_params['notcleared'] = params['notcleared']
      PageData.get_progression_puzzles(skip, size, sort, search, send_params, (page) =>
        @build_puzzles(block, $container, params, page)
      )


  build_puzzles : (block, $container, params, page) ->

    type = params['type']
    skip = params['skip']
    size = params['size']
    sort = params['sort']
    search = params['search']

    if Application.CURRENT_USER?
      if Application.CURRENT_USER['points']?
        if parseInt(Application.CURRENT_USER['points']) >= 20000
          params['puzzle_creatable'] = true


    param_string = {}
    param_string.size = size
    param_string.search = search
    param_string.single = if params['single'] then params['single'] else undefined
    param_string.switch = if params['switch'] then params['switch'] else undefined
    param_string.vienna = if params['vienna'] then params['vienna'] else undefined
    param_string.rnassd = if params['rnassd'] then params['rnassd'] else undefined
    param_string.inforna = if params['inforna'] then params['inforna'] else undefined
    param_string.notcleared = if params['notcleared'] then params['notcleared'] else undefined

    param_string.sort = "date"
    params['date_sort_url'] = "/web/" + type + "/?" + Utils.generate_parameter_string(param_string)

    param_string.sort = "reward"
    params['reward_sort_url'] = "/web/" + type + "/?" + Utils.generate_parameter_string(param_string)

    param_string.sort = "solved"
    params['solved_sort_url'] = "/web/" + type + "/?" + Utils.generate_parameter_string(param_string)

    param_string.sort = "length"
    params['length_sort_url'] = "/web/" + type + "/?" + Utils.generate_parameter_string(param_string)

    param_string.sort = params['sort']

    if !(skip?)
      skip = 0
    if !(size?)
      size = 24

    puzzles = page["puzzles"]
    num_puzzles = page["num_puzzles"]
    cleared_puzzles = page["cleared"]
    ThemeCompiler.compile_block(block,params,$container)

    $puzzles = @get_element("puzzles")
    packer = Packers($puzzles)
    puzzle_params = []

    for ii in [0..puzzles.length-1] by 1
      puzzleid = puzzles[ii]['id']
      cleared = false

      if cleared_puzzles?
        for jj in [0..cleared_puzzles.length-1] by 1
          if puzzleid == cleared_puzzles[jj]['nid']
            cleared=true
            break;

      puzzles[ii]['cleared'] = cleared
      puzzle_params.push(puzzles[ii])

    packer.add(puzzle_params)

    total_puzzles = page["num_puzzles"]
    if $pager = @get_element("pager")
      pager_str = EternaUtils.get_pager(Math.floor(skip/size), Math.ceil(total_puzzles/size), (pageindex) =>
        url_params = {skip:pageindex * size, size:size, sort:sort, single:params['single'], switch:params['switch'], vienna:params['vienna'], rnassd:params['rnassd'], inforna:params['inforna'], notcleared:params['notcleared']}
        if search?
          url_params['search'] = search
        return "/web/" + type + "/?" + Utils.generate_parameter_string(url_params, true)
      )

      $pager.html(pager_str)

    if $search = @get_element("search")
      $search.attr("value", search)

      $search.keyup((e) =>
        if e.keyCode == KeyCode.KEYCODE_ENTER
          search = $search.attr("value")
          param_string.search = search
          url = "/web/" + type + "/?" + Utils.generate_parameter_string(param_string)
          Utils.redirect_to(url)
      )

    if $single = @get_element("single")
      if params['single'] == "checked" then $single.attr("checked", true)

      $single.click(()=>
         if params['single']!="checked" then param_string.single="checked" else param_string.single=undefined
         url = "/web/" + type + "/?" + Utils.generate_parameter_string(param_string)
         Utils.redirect_to(url)
      )

    if $switch = @get_element("switch")
      if params['switch'] == "checked" then $switch.attr("checked", true)

      $switch.click(()=>
         if params['switch']!="checked" then param_string.switch="checked" else param_string.switch=undefined
         url = "/web/" + type + "/?" + Utils.generate_parameter_string(param_string)
         Utils.redirect_to(url)
      )

    if $vienna = @get_element("vienna")
      if params['vienna'] == "fail" then $vienna.attr("checked", true)

      $vienna.click(()=>
         if params['vienna']!="fail" then param_string.vienna="fail" else param_string.vienna=undefined
         url = "/web/" + type + "/?" + Utils.generate_parameter_string(param_string)
         Utils.redirect_to(url)
      )


    if $rnassd = @get_element("rnassd")
      if params['rnassd'] == "fail" then $rnassd.attr("checked", true)

      $rnassd.click(()=>
         if params['rnassd']!="fail" then param_string.rnassd="fail" else param_string.rnassd=undefined
         url = "/web/" + type + "/?" + Utils.generate_parameter_string(param_string)
         Utils.redirect_to(url)
      )

    if $inforna = @get_element("inforna")
      if params['inforna'] == "fail" then $inforna.attr("checked", true)

      $inforna.click(()=>
         if params['inforna']!="fail" then param_string.inforna="fail" else param_string.inforna=undefined
         url = "/web/" + type + "/?" + Utils.generate_parameter_string(param_string)
         Utils.redirect_to(url)
      )


    if $notcleared = @get_element("notcleared")
      if params['notcleared'] == "true" then $notcleared.attr("checked", true)

      $notcleared.click(()=>
         if params['notcleared']!="true" then param_string.notcleared="true" else param_string.notcleared=undefined
         url = "/web/" + type + "/?" + Utils.generate_parameter_string(param_string)
         Utils.redirect_to(url)
      )

class @BuilderPuzzlePageEdit extends Builder
  on_build : (block, $container, params) ->
    nid = params['nid']

    if !(nid?)
      Utils.display_error("nid not specified")
      return

    PageData.get_puzzle(nid, (page)=>
      puzzle = page['puzzle']
      if Application.CURRENT_USER['uid'] != puzzle['uid']
        alert "Can't modify this puzzle"
        url = "/web/puzzle/"+nid+"/"
        Utils.redirect_to(url)
        return
      BuilderPuzzlePage.prototype.process_pagebuild(block, $container, params, nid, page)
      if $edit = @get_element("citylights")
        $edit.click(()=>
            $title = @get_element("title")
            $description = @get_element("description")
            title = $title.val()
            description = $description.val()
            if title == "" || description == ""
              alert "Please put title or description"
              return
            puzzle_param = {}
            puzzle_param['title'] = title
            puzzle_param['description'] = description
            Overlay.show()
            PageData.edit_puzzle(nid, puzzle_param, (data)=>
              Overlay.hide()
              if data['success']
                url = "/web/puzzle/"+nid+"/"
                Utils.redirect_to(url)
              else
               alert "Puzzle edit fail!!"
              )
          )
      )

class @BuilderRunScriptOverlay extends @BuilderScriptListsPage
  on_build : (block, $container, params) ->
     ThemeCompiler.compile_block(block,params,$container)
     @show_listoverlay(params)

  show_listoverlay : (params) ->
    @skip = params['skip']
    size = params['size']
    search = "Puzzle Solving"
    secstruct = params['secstruct']
    if !(skip?)
      @skip = 0
    if !(size?)
      size = 10
    @initialize_scripts(@skip, size, search, secstruct)
    if $morescripts = @get_element("morescripts")
      $morescripts.click(()=>
        @skip += size
        @initialize_scripts(@skip, size, search, secstruct)
        )


  initialize_scripts : (skip, size, search, secstruct) ->
    if $script_lists_container = @get_element("script_lists")
      if $loading = @get_element("loading")
        $loading.show();
      Script.get_script_lists(skip,size,search,(data) =>
        if skip > data['total_script']
          $loading.hide()
          return

        block = Blocks("script-lists-overlay")
        scripts = data['lists']
        @set_script_lists(block, $script_lists_container, scripts)

        builderscript = new BuilderScriptPage
        builderscript.initialize_flash()
        builderscript.initialize_pervasives()
        timeout = 10

        for i in [0..scripts.length-1]
          id = scripts[i]['nid']
          do (id) =>
            $("#"+id).click(()=>
              if $timeout = @get_element("timeout")
                t = $timeout.attr('value')
                if t != '' && !(/[^0-9]+/.test(t)) then timeout = t
              if $result = @get_element("result")
                try
                  $result.attr('value', '')
                  Lib = new Library()
                  secstruct = secstruct
                  func = Lib.EternaScriptSource(id)
                  func = builderscript.insert_timeout(func, timeout)
                  func = eval(func)
                  result = func(secstruct)
                catch Error
                  result = Error
                finally
                  $result.attr('value', result)
            )
        $loading.hide()
      )
