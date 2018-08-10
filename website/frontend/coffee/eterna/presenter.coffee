
@PageData = {

  reset_user_progress : (uid, success_cb, fail_cb) ->
    query_params = {type:"reset_user_progress", uid:uid}
    url = Application.POST_URI
    AjaxManager.query("POST", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        if success_cb?
          success_cb(data)
      )      
    , fail_cb)    

  restore_user_progress : (uid, success_cb, fail_cb) ->
    query_params = {type:"restore_user_progress", uid:uid}
    url = Application.POST_URI
    AjaxManager.query("POST", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        if success_cb?
          success_cb(data)
      )      
    , fail_cb)    

  get_puzzle_tutscripts: (pid, success_cb, fail_cb) ->
    if !success_cb
      return
    url = Application.GET_URI

    AjaxManager.query("GET", url, {type:"tutscripts",pid:pid}, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    , fail_cb)
 
  get_tutscript: (nid, success_cb, fail_cb) ->
    if !success_cb
      return
    url = Application.GET_URI

    AjaxManager.query("GET", url, {type:"tutscript",nid:nid}, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    , fail_cb)

  get_tutscripts: (uid, success_cb, fail_cb) ->
    if !success_cb
      return
    url = Application.GET_URI

    AjaxManager.query("GET", url, {type:"tutscripts",uid:uid}, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    , fail_cb)

  get_all_tutscripts: (success_cb, fail_cb) ->
    if !success_cb
      return
    url = Application.GET_URI

    AjaxManager.query("GET", url, {type:"tutscripts"}, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    , fail_cb)


  get_me : (filter, size, success_cb, fail_cb) ->
    
    if !success_cb
      return
    
    if !size
      size = 4

    url = Application.GET_URI
    AjaxManager.query("GET", url, {type:"me", filter:filter, size:size}, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    , fail_cb)

  get_newsfeed : (pageindex, filter, size, success_cb, fail_cb) ->

    if !success_cb
      return

    if !size
      size = 4
      
    url = Application.GET_URI
    AjaxManager.query("GET", url, {type:"newsfeed", skip:pageindex * size, size:size, filter:filter}, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    , fail_cb)

  get_strategies : (success_cb, fail_cb) ->

    if !success_cb
      return

    url = Application.GET_URI

    AjaxManager.query("GET", url, {type:"strategies"}, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    , fail_cb)

  get_achievements : (success_cb, fail_cb) ->

    if !success_cb
      return
    
    url = Application.GET_URI

    AjaxManager.query("GET", url, {type:"achievements"}, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    , fail_cb)    

  get_achievement_roadmap : (success_cb, fail_cb) ->

    if !success_cb
      return

    url = Application.GET_URI

    AjaxManager.query("GET", url, {type:"achievement_roadmap"}, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    , fail_cb)    


  get_side_project_roadmap : (success_cb, fail_cb) ->

    if !success_cb
      return

    url = Application.GET_URI

    AjaxManager.query("GET", url, {type:"side_project_roadmap"}, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    , fail_cb)    
    
  get_newslist : (skip, size, search, success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"newslist", skip:skip, size:size, search:search}      
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )  
    , fail_cb)
    
  get_recents : (success_cb, fail_cb) -> 
    if !success_cb
      return
      
    query_params = {type:"recents"}      
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )  
    , fail_cb)
    
  get_news : (nid, success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"news", nid:nid}
    
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )
    
  get_groups : (skip, size, search, sort, success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"groups", skip:skip, size:size, search:search, sort:sort}      
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )  
    , fail_cb)

  get_my_groups : (skip, size, search, sort, success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"my_groups", skip:skip, size:size, search:search, sort:sort}      
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )  
    , fail_cb)

  get_group : (nid, skip, size, search, success_cb, fail_cb) ->
    if !success_cb
      return

    query_params = {type:"group", nid:nid, skip:skip, size:size, search:search}
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )  
  get_comments : (nid, success_cb, fail_cb) ->
    if !success_cb
      return
    query_params = {nid:nid, type:"comments"}
    url = Application.GET_URI
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    , fail_cb)
  
  get_playerpubslist : (skip, size, search, success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"playerpubslist", skip:skip, size:size, search:search}      
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )  
    , fail_cb)

  get_researcherpubslist : (skip, size, search, success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"researcherpubslist", skip:skip, size:size, search:search}      
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )  
    , fail_cb)

  get_blogslist : (skip, size, search, success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"blogslist", skip:skip, size:size, search:search}      
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )  
    , fail_cb)

  get_blogs : (nid, success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"blogs", nid:nid}
    
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )     
    
  get_puzzle : (nid, success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"puzzle", nid:nid}
    
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )      
    
  get_tutorials : (success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"puzzles", puzzle_type:"Basic"}
    
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )

  get_switch_tutorials : (success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"puzzles", puzzle_type:"SwitchBasic"}
    
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )  

  get_challenges : (skip, size, sort, search, filter , success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"puzzles", sort:sort, puzzle_type:"Challenge", skip:skip, size:size, search:search, single:filter.single, switch:filter.switch, notcleared:filter.notcleared, uid:filter.uid}
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )  
    , fail_cb)
    
  get_player_puzzles : (skip, size, sort, search, filter, success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"puzzles", sort:sort, puzzle_type:"PlayerPuzzle", skip:skip, size:size, search:search, single:filter.single, switch:filter.switch, vienna:filter.vienna, rnassd:filter.rnassd, inforna:filter.inforna, notcleared:filter.notcleared}
    if filter['uid']
      query_params['uid'] = filter['uid']
    
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    , fail_cb)

  get_progression_puzzles : (skip, size, sort, search, filter, success_cb, fail_cb) ->
    if !success_cb
      return

    query_params = {type:"puzzles", puzzle_type:"Progression", sort:sort, skip:skip, size:size, search:search, notcleared:filter.notcleared}

    url = Application.GET_URI

    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    , fail_cb)


  get_players : (skip, size, sort, search, success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"users", sort:sort, skip:skip, size:size, search:search}      
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )  
    , fail_cb)


  get_usernames : (search, size, skip, success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"usernames", search:search, size:size, skip:skip}      
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )  
    , fail_cb)


  get_player : (uid, tab_type, view_option, success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"user", uid:uid, tab_type:tab_type, view_option:view_option}
    if Application.CURRENT_USER? and Application.CURRENT_USER.uid == uid
      query_params.type = "my_user"
       
    url = Application.GET_URI    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )


  get_labs : (lab_type, params, success_cb, fail_cb) ->
    if !success_cb
      return
      
    if !(lab_type?)
      lab_type ="active_projects"
      
    query_params = {project_type:params['project_type'], type:lab_type, single:params['single'], switch:params['switch'], search:params['search'], skip:params['skip'], size:params['size'], sort:params['sort']}
    
    if params['skip']?
      query_params['skip'] = params['skip']
    if params['size']?
      query_params['size'] = params['size']   
 
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )    
  
  get_labs_for_tracker : (params, success_cb, fail_cb) ->
    if !success_cb
      return
 
    query_params = {type:"get_labs_for_tracker"}
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )    

  get_labs_for_lab_cards : (params, success_cb, fail_cb) ->
    if !success_cb
      return

    type = "get_labs_for_lab_cards"
    if params['cards_type']? and params['cards_type'] == "my_lab_cards"
      type = "get_labs_for_my_lab_cards"

    size = 9
    if params['size']?
      size = params['size']

    skip = 0
    if params['skip']?
      skip = params['skip']
   
    query_params = {type:type, size:size, skip:skip}
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )    


  get_noti_count_for_user : (success_cb, fail_cb) ->
    if !success_cb
      return

    query_params = {type:"noti_count_for_user"}
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )    

  get_lab : (nid, success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"project", nid:nid}
    
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )    
  get_lab_puzzle : (nid, success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"lab_puzzle", nid:nid}
    
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )  
  
  delete_cloud_lab : (nid, success_cb, fail_cb) ->
    query_params = {type:"delete_cloud_lab", nid:nid}
    url = Application.POST_URI
    AjaxManager.query("POST", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        if success_cb?
          success_cb(data)
      )      
    , fail_cb)    
    
  delete_proposed_lab : (nid, success_cb, fail_cb) ->
    query_params = {type:"delete_proposed_lab", nid:nid}
    url = Application.POST_URI
    AjaxManager.query("POST", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        if success_cb?
          success_cb(data)
      )
    , fail_cb)
      
  get_lab_solutions : (success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"lab_solutions"}
    
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    ) 
  
  get_solution_info : (solid, round, success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"solution_info", solid:solid, round:round}
    
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    ) 
    
  get_synthesized_results : (params, success_cb, fail_cb) ->
    if !success_cb
      return

    if !(params['Designer']?)
      params['Designer'] = null
      
    query_params = {type:"lab_synthesized_results", nid:params['nid'], Designer:params['Designer']}
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )      
  
  get_labs_for_collection : (params, success_cb, fail_cb) ->
    if !success_cb
      return
 
    query_params = {type:"get_labs_for_collection"}
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )    
  
  get_sequences_for_collection : (params, success_cb, fail_cb) ->
    if !success_cb
      return
 
    query_params = {type:"get_sequences_for_collection"}
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )    
  
  get_sequence_data_for_collection : (params, success_cb, fail_cb) ->
    if !success_cb
      return
 
    query_params = {type:"get_sequence_data_for_collection"}
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )    

  process_incognito : (success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {type:"process_incognito"}
    
    url = Application.POST_URI
    
    AjaxManager.query("POST", url, query_params, (response) =>
      if response?
        response['new_achievements'] = null
      EternaUtils.process_response(response, (data) => 
        success_cb(data)
      )      
    )

  display_data_browser : (params, success_cb, fail_cb) ->
    if !success_cb
      return
      
    query_params = {}
    
    url = Application.GET_URI
    
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )  

  add_project_coadmin : (nid, name, success_cb, fail_cb) ->
    query_params = {type:"add_admin_to_project", nid:nid, name:name}
    url = Application.POST_URI
    
    AjaxManager.query("POST", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    , fail_cb)

  remove_project_coadmin : (nid, name, success_cb, fail_cb) ->
    query_params = {type:"remove_admin_to_project", nid:nid, name:name}
    url = Application.POST_URI
    
    AjaxManager.query("POST", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    , fail_cb)

  post_project_vote : (nid, success_cb, fail_cb) ->
    query_params = {type:"cloud_vote", nid:nid}
    url = Application.POST_URI
    
    AjaxManager.query("POST", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )           
    , fail_cb)

  delete_project_vote : (nid, success_cb, fail_cb) ->
    query_params = {type:"cloud_unvote", nid:nid}
    url = Application.POST_URI
    
    AjaxManager.query("POST", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )           
    , fail_cb)

  post_project_conclusion : (nid, conclusion, success_cb, fail_cb) ->
    query_params = {type:"project_conclusion", nid:nid, conclusion:conclusion}
    url = Application.POST_URI
    
    AjaxManager.query("POST", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    , fail_cb)

  create_puzzle_image : (nid, sec_struct, success_cb, fail_cb) ->
    query_params = {type:"create_puzzle_image", nid:nid, sec_struct:sec_struct}
    url = Application.POST_URI
    
    AjaxManager.query("POST", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    , fail_cb)

  save_puzzle_tutorial : (nid, tutorial) ->
    query_params = {type:"save_puzzle_tutorial", nid:nid, tutorial:tutorial}
    url = Application.POST_URI
    AjaxManager.query("POST", url, query_params)
	      
  edit_puzzle : (nid, params, success_cb, fail_cb) ->
    query_params = {type:"edit_puzzle", nid:nid, title:params['title'], description:params['description']}
    url = Application.POST_URI
    
    AjaxManager.query("POST", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    , fail_cb)
    
  start_cloud_lab_next_round : (nid, success_cb, fail_cb) ->
    query_params = {type:"start_cloud_lab_next_round", nid:nid}
    url = Application.POST_URI
    
    AjaxManager.query("POST", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )           
    , fail_cb)
    
}


@Comment = {
  post_comment : (nid, body, is_super, success_cb, fail_cb) ->
    query_params = {type:"post_comment", nid:nid, body:body, supercomment:is_super}
    
    if location.pathname
      query_params['pathname'] = location.pathname
        
    url = Application.POST_URI
    
    AjaxManager.query("POST", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )         

  delete_comment : (cid, success_cb, fail_cb) ->
    query_params = {type:"delete_comment", cid:cid}
    
    url = Application.POST_URI
    
    AjaxManager.query("POST", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    ) 
}

@Follow = {
  follow : (id, follow_type, parent_id, success_cb, fail_cb) ->
    url = Application.POST_URI
    query_params = {id:id, type:"follow", follow_type:follow_type, parent_id:parent_id}
    AjaxManager.query("POST", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )  
    
  get_follow : (id, follow_type, success_cb, fail_cb) ->
    url = Application.GET_URI
    query_params = {id:id, type:"follow", follow_type:follow_type}
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )  
        
  get_follows : (type, success_cb, fail_cb) ->
    url = Application.GET_URI
    query_params = {type:"follows", follow_type:type}
    AjaxManager.query("GET", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    )    
  
  expire_follow : (id, follow_type, success_cb) ->
    url = Application.POST_URI
    query_params = {id:id, type:"expire_follow", follow_type:follow_type}
    AjaxManager.query("POST", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    ) 
    
  expire_followers : (id, follow_type, success_cb) ->
    url = Application.POST_URI
    query_params = {id:id, type:"expire_followers", follow_type:follow_type}
    AjaxManager.query("POST", url, query_params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )      
    ) 
}

@Group = {
  subscribe: (uid, nid, is_private, success_cb) ->
    url = Application.POST_URI
    params = {}
    params['type'] = "subscribe"
    params['uid'] = uid
    params['nid'] = nid
    params['is_private'] = is_private
    
    AjaxManager.query("POST", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    ) 
  
  unsubscribe: (uid, nid, success_cb) ->
    url = Application.POST_URI
    params = {}
    params['type'] = "unsubscribe"
    params['uid'] = uid;
    params['nid'] = nid;
    
    AjaxManager.query("POST", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    ) 
  
  delete: (nid, success_cb) ->
    url = Application.POST_URI
    params = {}
    params['type'] = "delete_group"
    params['nid'] = nid;
    
    AjaxManager.query("POST", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )
         
  accept: (uid, nid, success_cb) ->
    url = Application.POST_URI
    params = {}
    params['type'] = "accept"
    params['uid'] = uid;
    params['nid'] = nid;
    
    AjaxManager.query("POST", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    ) 
  
  reject: (uid, nid, success_cb) ->
    url = Application.POST_URI
    params = {}
    params['type'] = "reject"
    params['uid'] = uid;
    params['nid'] = nid;
    
    AjaxManager.query("POST", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )

  invite_member: (params, success_cb) ->
    url = Application.POST_URI

    AjaxManager.query("POST", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )     

  add_admin: (params, success_cb) ->
    url = Application.POST_URI

    AjaxManager.query("POST", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )
  
  follow_group: ( uid, nid, success_cb ) ->
    url = Application.POST_URI
    
    params = {}
    params['type'] = "follow_group"
    params['uid'] = uid
    params['nid'] = nid

    AjaxManager.query("POST", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )  
  
  unfollow_group: ( uid, nid, success_cb ) ->
    url = Application.POST_URI

    params = {}
    params['type'] = "unfollow_group"
    params['uid'] = uid
    params['nid'] = nid

    AjaxManager.query("POST", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )     

}

@Me = {

  reply : (target_uid, body, parent_nid, success_cb) ->
    url = Application.POST_URI
    params = {}
    params['type'] = "message"
    params['action'] = "add"
    params['target_uid'] = target_uid
    params['body'] = body
    params['parent_nid'] = parent_nid
    
    AjaxManager.query("POST", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )

  update_survey : (uid, value, success_cb) ->
    url = Application.POST_URI
    params = {}
    params['type'] = "survey"
    params['action'] = "update"
    params['uid'] = uid
    params['value'] = value
    
    AjaxManager.query("POST", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )

  update_press_corps_events : (uid, value, success_cb) ->
    url = Application.POST_URI
    params = {}
    params['type'] = "press_corps_events"
    params['action'] = "update"
    params['uid'] = uid
    params['value'] = value
    
    AjaxManager.query("POST", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )
    
  update_user_events : (uid, value, success_cb) ->
    url = Application.POST_URI
    params = {}
    params['type'] = "user_events"
    params['action'] = "update"
    params['uid'] = uid
    params['value'] = value
    
    AjaxManager.query("POST", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )

}

@Script = {
  get_script_lists : (_skip, _size, _search, success_cb) ->
    url = Application.GET_URI
    params = {type:"script", need:"lists", skip:_skip, size:_size, script_type:_search}
    AjaxManager.query("GET", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )
  
  get_script_lists_with_sort : (_skip, _size, _type, _sort, _search, success_cb) ->
    url = Application.GET_URI
    params = {type:"script", need:"lists", skip:_skip, size:_size, script_type:_type, search:_search, sort:_sort}
    AjaxManager.query("GET", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )
  
  get_script : (script_id, success_cb, immediate) ->
    if @cached_script
      if (@cached_script[script_id]?)
        if immediate? and !!immediate
          success_cb(@cached_script[script_id])
          return
        setTimeout(() =>
          success_cb(@cached_script[script_id])
        , 0)
        return
    else
      @cached_script = {}
    url = Application.GET_URI
    params = {type:"script", need:"script", id:script_id}
    AjaxManager.query("GET", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        @cached_script[script_id] = data
        success_cb(data)
      )
    )

  get_script_with_test : (script_id, _skip, _size, options, success_cb) ->
    url = Application.GET_URI
    params = {type:"script", need:"script_with_test", id:script_id, skip:_skip, size:_size, search:options['search'], sort:options['sort'], pass:options['pass'], fail:options['fail'], timeout:options['timeout']}
    AjaxManager.query("GET", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )
    
  get_script_sync : (script_id) ->
    url = Application.GET_URI
    params = {type:"script", need:"script", id:script_id}
    return AjaxManager.querySync("GET", url, params)
  
  post_script : (nid, title, source, type, input, samples, description, success_cb) ->
    url = Application.POST_URI
    params = {}
    if nid?
      params['parent_nid'] = nid
    params['type'] = "script"
    params['need'] = "save"
    params['title'] = title
    params['script_type'] = type
    params['source'] = source
    params['input'] = input
    params['author'] = {id:Application.CURRENT_USER.uid, name:Application.CURRENT_USER.name}
    params['samples'] = samples
    params['description'] = description
    
    AjaxManager.query("POST", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )
  increase_pageview : (id, success_cb) ->
    url = Application.POST_URI
    params = {type:"script", need:"increase_pageview", id:id}
    AjaxManager.query("POST", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)      
      )
    )
  evaluate_script : (input, target_info, code, success_cb, fail_cb) ->
    url = Application.SCRIPT_URI + "/code/"
    params = {target_info:target_info, input:input, code:code}
    AjaxManager.query("POST", url, params, (response) =>
      success_cb(response)      
    , (error) =>
      fail_cb(error)
      )

  evaluate_testsets : (testsets, success_cb) ->
    url = Application.SCRIPT_URI + "/eval/"
    params = {testsets:testsets}
    AjaxManager.query("POST", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )      

  evaluate_script_id_sync : (id) ->
    url = Application.SCRIPT_URI + "/id/"+id
    params = {}
    return AjaxManager.querySync("GET", url, params)
    
  evaluate_script_code_sync : (code) ->
    url = Application.SCRIPT_URI + "/code/"
    params = {code:code}
    return AjaxManager.querySync("POST", url, params)
    
  get_solution_for_script : (nid, success_cb) ->
    url = Application.GET_URI
    params = {type:"script", need:"solution", nid:nid}
    AjaxManager.query("GET", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )  
  #it grabs whole solutions if nid is the id of puzzle else if nid is the id of solution just grab one solution  
  get_solutions_for_script : (nid, success_cb) ->
    url = Application.GET_URI
    params = {type:"script", need:"solutions", nid:nid}
    AjaxManager.query("GET", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )      
  get_puzzles_for_batch : (params, success_cb, fail_cb) ->
    url = Application.GET_URI
    params['type'] = "script"
    if !(params?)
      params = {}
    params['need'] = "batch"
    AjaxManager.query("GET", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )   
  get_puzzles_for_script_library : (params) ->
    url = Application.GET_URI
    if !(params?)
      params = {}
    params['type'] = "script"
    params['need'] = "puzzles"
    return AjaxManager.querySync("GET", url, params)
    
  get_puzzles_for_script_library_async : (params, success_cb) ->
    url = Application.GET_URI
    if !(params?)
      params = {}
    params['type'] = "puzzles"
    params['need'] = "puzzles"
    AjaxManager.query("GET", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )
  
  remove_script : (nid, success_cb) ->
    url = Application.POST_URI
    params = {}
    params['type'] = "remove_script"
    params['nid'] = nid
    
    AjaxManager.query("POST", url, params, (response) =>
      EternaUtils.process_response(response, (data) =>
        success_cb(data)
      )
    )

}
