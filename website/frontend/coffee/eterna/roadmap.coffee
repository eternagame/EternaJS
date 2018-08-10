class @Roadmap

  @roadmap_nodes_ = new Object()
  
  set_nodes : (achievements, ignore = true, ach_type = "") ->

    ach_types = []
    if (ach_type.indexOf("side-quests") > -1)
      ach_types.push("ten_tools")
      ach_types.push("side_quest")
    else if (ach_type.indexOf("legacy") > -1) 
      ach_types.push("legacy")
    else
      ach_types.push("ten_tools")


    @roadmap_nodes_ = []
    for ii in [0..achievements.length-1] by 1
      if (achievements[ii]['key'] != "founding" and achievements[ii]['key'] != "beta_tester" and achievements[ii]['key'] != "eternacon2015")
        if ach_types.indexOf("legacy") < 0
          for jj in [0..ach_types.length-1] by 1
            if (achievements[ii]['key'].indexOf(ach_types[jj]) > -1)
              @roadmap_nodes_.push(Utils.clone_object(achievements[ii]))
              break
        else
          @roadmap_nodes_.push(Utils.clone_object(achievements[ii]))

    for own ach_key,ach_val of @roadmap_nodes_  
      ach_val['node_key'] = ach_val['key'] + if ach_val['level']? then ach_val['level'] else ""      

      ach_val['width'] = 245
      ach_val['height'] = 300
      ach_val['state'] = "inactive"
      if ach_val['current_level'] >= ach_val['level']
        if (ach_val['key'].indexOf("side_quest") > -1 and ach_val['level'] >= ach_val['maxlevel'])
          ach_val['state'] = "active"
          ach_val['to_next'] = 1.0
        else
          ach_val['state'] = "cleared"
      else if ach_val['level'] == 1
        if Application.GLOBAL_THEME_PARAMETERS['is_lab_member'] == true
          if ach_val['key'].indexOf("side_quest") > -1
            ach_val['state'] = "active"
      ach_val['progress'] = Math.floor(parseFloat(ach_val['to_next']) * 100)

      if ach_val['level'] > 1
        ach_val['prereq'] = ach_val['key'] + (ach_val['level'] - 1)

    for own ach_key,ach_val of @roadmap_nodes_ 
      former_state = ach_val['state']
      if (former_state == "cleared" or former_state == "active")
        ach_prereq = @get_node(ach_val['prereq'])
        if Application.GLOBAL_THEME_PARAMETERS['is_lab_member'] != true
          if ach_prereq?
            if ach_prereq['state'] != "cleared"
              ach_val['state'] = "inactive"
        continue

      if ach_val['prereq']?
        ach_prereq = @get_node(ach_val['prereq'])
        if !(ach_prereq?)
          Utils.display_error("Can't find " + ach_val['prereq'])
        else
          if ach_prereq['state'] == "cleared"
            ach_val['state'] = "active"
      else
        if ach_val['node_key'] != "founding1"
          ach_val['state'] = "active"

    for own ach_key,ach_val of @roadmap_nodes_
      ach_val['link'] = @get_link_from_key(ach_val['key'])
      ach_val['image_link'] = @get_image_link_from_key(ach_val['key'])

  get_nodes : () ->
    return @roadmap_nodes_

  get_node : (key) ->
    for ii in [0..@roadmap_nodes_.length-1] by 1
      if @roadmap_nodes_[ii].node_key == key
        return @roadmap_nodes_[ii]
    return null

  get_active_node : (key) ->
    for ii in [0..@roadmap_nodes_.length-1] by 1
      if (@roadmap_nodes_[ii].key == key and @roadmap_nodes_[ii].state == "active") 
        return @roadmap_nodes_[ii]
    return null

  get_current_puzzle : (key) ->
    node = this.get_active_node(key)
    if (node? and node.current_puzzle?)
      return node.current_puzzle
    return null
    
  get_link_from_key : (key) ->
    if key == "register"
      return "/web/register/"
    else if key == "tutorial"
      return "/web/tutorials/"
    else if key == "switch_tutorial"
      return "/web/tutorials/"
    else if key == "puzzle_solver"
      return "/web/challenges/"
    else if key == "lab"
      return "/web/challenges/"
    else if key == "comments"
      return "/web/news/"
    else if key == "profile_desc"
      if Application.CURRENT_USER
        return "/web/player/" + Application.CURRENT_USER['uid'] + "/"
      else
        return "/web/register/"
    else if key == "follower"
      return "/web/players/?sort=synthesizes"
    else if key == "leader"
      return "/web/players/"
    else if key == "vote"
      return "/web/labs/"
    else if key == "synthesizer"
      return "/web/labs/"
    else if key == "lab_winner"
      return "/web/labs/"
    else if key == "top_player"
      return "/web/challenges/"
    else if key == "puzzle_architect"
      return "/web/playerpuzzles/"
    else if key == "millionaire"
      return "/web/challenges/" 
    else if key == "nova"
      return "http://www.pbs.org/wgbh/nova/labs/lab/rna/"
    else if key == "eternacon2015"
      return "https://sites.google.com/site/eternacon2015/"
    else if key == "eterna100"
      #return "/web/playerpuzzles/?size=24&search=:Eterna100&notcleared=true&sort=solved"
      return "/web/blog/6136054/"
    else if key == "ten_tools"
      if Application.CURRENT_USER
        current_puzzle = this.get_current_puzzle(key)
        if current_puzzle?
          return "/game/puzzle/" + current_puzzle + "/"
        else
          return "/web/progression/?size=10"
      else
	# Send unregistered users to register after first badge
        return "/web/register/"
    else if key == "side_quest_just_for_fun"
      if Application.CURRENT_USER
        current_puzzle = this.get_current_puzzle(key)
        if current_puzzle?
          return "/web/puzzle/" + current_puzzle + "/"
        else
          #return "/web/playerpuzzles/?size=50&search=:SPJustForFun&notcleared=true&sort=solved"
          return "/web/playerpuzzles/?size=24&search=Fun&sort=date"
      else
	# Send unregistered users to register after first badge
        return "/web/register/"
    else if key == "side_quest_nova_videos"
      return "http://www.pbs.org/wgbh/nova/labs/lab/rna/"
    else if key == "side_quest_challenge_puzzles"
      return "/web/challenges/?size=50&notcleared=true&sort=solved"
    else if key == "side_quest_puzzle_of_the_day"
      return "/web/playerpuzzles/?size=1&search:SPPuzzleOfTheDay&notcleared=true&sort=date"
    else if key == "side_quest_eterna100"
      return "/web/playerpuzzles/?size=50&search=:Eterna100&notcleared=true&sort=solved"
    else if key == "side_quest_best_lab_practices"
      if Application.CURRENT_USER
        current_puzzle = this.get_current_puzzle(key)
        if current_puzzle?
          return "/web/puzzle/" + current_puzzle + "/"
        else
          return "/web/playerpuzzles/?skip=72&search=%5BLab%20Tutorial%5D&sort=date"
      else
	# Send unregistered users to register after first badge
        return "/web/register/"
    else if key == "side_quest_switch_puzzles"
      if Application.CURRENT_USER
        current_puzzle = this.get_current_puzzle(key)
        if current_puzzle?
          return "/web/puzzle/" + current_puzzle + "/"
        else
          #return "/web/playerpuzzles/?size=50&search=:SPSwitchPuzzles&switch=checked&sort=solved"
          return "/web/playerpuzzles/?size=24&search=switch&switch=checked&sort=date"

      else
	# Send unregistered users to register after first badge
        return "/web/register/"
    else if key == "side_quest_create_a_puzzle"
      return "/game/puzzlemaker/"
    else if key == "side_quest_create_a_tutorial"
      #return "javascript:void(0)"
      ###
      if Application.CURRENT_USER
        user_puzzle = this.get_current_puzzle(key) 
        if user_puzzle?
          #return "/web/tutscripts/?pid=" + user_puzzle
          return "/game/tuttest/?pid=" + user_puzzle
        else
          #return "/web/tutscripts/?uid=" + Application.CURRENT_USER['uid']
          return "/game/puzzlemaker/"
      else
        return "/web/tutscripts/"
      ###
      return 'https://docs.google.com/document/d/1m9vkiZO9_MslT1qOXGpsfvKyCtWLLJcsW0BIbCZgHu8'
    else if key == "side_quest_create_a_script"
      return "/web/script/create/"
    return ""
    
    
  get_image_link_from_key : (key) ->
    if key == "side_quest_just_for_fun"
      if Application.CURRENT_USER
        #return "/web/playerpuzzles/?size=50&search=:SPJustForFun&notcleared=true&sort=solved"
        return "/web/playerpuzzles/?size=24&search=Fun&sort=date"
      else
	# Send unregistered users to register after first badge
        return "/web/register/"
    else if key == "side_quest_nova_videos"
      return "http://www.pbs.org/wgbh/nova/labs/lab/rna/"
    else if key == "side_quest_challenge_puzzles"
      return "/web/challenges/?size=50&notcleared=true&sort=solved"
    else if key == "side_quest_puzzle_of_the_day"
      return "/web/playerpuzzles/?size=1&search:SPPuzzleOfTheDay&notcleared=true&sort=date"
    else if key == "side_quest_eterna100"
      return "/web/playerpuzzles/?size=50&search=:Eterna100&notcleared=true&sort=solved"
    else if key == "side_quest_best_lab_practices"
      if Application.CURRENT_USER
        return "/web/playerpuzzles/?skip=72&search=%5BLab%20Tutorial%5D&sort=date"
      else
	# Send unregistered users to register after first badge
        return "/web/register/"
    else if key == "side_quest_switch_puzzles"
      if Application.CURRENT_USER
        #return "/web/playerpuzzles/?size=50&search=:SPSwitchPuzzles&switch=checked&sort=solved"
        return "/web/playerpuzzles/?size=24&search=switch&switch=checked&sort=date"
      else
	# Send unregistered users to register after first badge
        return "/web/register/"
    else if key == "side_quest_create_a_puzzle"
      return "/game/puzzlemaker/"
    else if key == "side_quest_create_a_tutorial"
      return "/web/tutscripts/"
      #return "/web/tutscripts/"
    else if key == "side_quest_create_a_script"
      return "/web/script/"
    return ""
    
