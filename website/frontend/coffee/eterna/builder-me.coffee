class @BuilderMe extends Builder
  on_build : (block, $container, params) ->
    process_incognito = (Application.CURRENT_USER?) and ((Application.CURRENT_USER['points'] == null) or (parseInt(Application.CURRENT_USER['points']) == 0)) and (CookieManager.get_cookie("incognito_id")?)
    if process_incognito
      params['processing_incognito'] = true
      ThemeCompiler.compile_block(block,params,$container)
      PageData.process_incognito(() =>
        Utils.reload()
      , () =>
        Utils.display_error("Failed to reclaim your points. Please try again later")
        @build_me(block, $container, params) 
      )
    else
      @build_me(block, $container, params)
  
  build_me : (block, $container, params) ->

    if params['filter'] == undefined
      params['filter'] = "all"
    
    params['all_url'] = "/web/?filter=all"  
    params['notifications_url'] = "/web/?filter=notifications"
    params['news_url'] = "/web/?filter=news"
    params['blogs_url'] = "/web/?filter=blogs"
    
    if Application.CURRENT_USER
      params['uid'] = Application.CURRENT_USER['uid']

    size = 4
    if !(params['size']?) and params['sort']? and params['sort'] == 'date'
      size = 16

    PageData.get_me(params['filter'], size, (me_page) =>
      ThemeCompiler.compile_block(block,params,$container)
      $lab_member_panel = @get_element("lab-member-panel")
      $achievement_roadmap = @get_element("achievement-roadmap")
      $lab_cards_map = @get_element("lab-cards-map")
      $side_quest_roadmap = @get_element("side-quest-roadmap")
      $achievements = @get_element("achievements")
      $newsfeed = @get_element("newsfeed")
      if (!$achievements && !$newsfeed) || (!$achievement_roadmap && !$lab_member_panel && !newsfeed)
        Utils.display_error("Element missing in BuilderMe")
        return
	


      if current_lab = me_page['current_lab']

        if $banner_lab_link = document.getElementById("banner-lab-link")
          $banner_lab_link.href= "/web/lab/" + current_lab + "/"
	  
        if ($lab_member_panel?)
          if $start_lab_link = @get_element("start-lab-link")
            $start_lab_link.attr("href", "/web/lab/" + current_lab + "/")

      if $lab_training_panel = @get_element("lab-training-panel")
        $lab_training_roadmap = @get_element("lab-training-roadmap")
        PageData.get_side_project_roadmap((data) =>
          if ($side_projects = data['achievement_roadmap'])
            packer = Packers($lab_training_roadmap)
            roadmap_params = []
            roadmap = new Roadmap()
            roadmap.set_nodes($side_projects, false, ach_type = "side-quests")
            roadmap_nodes = roadmap.get_nodes()

            # check for side quests
            for ii in [0..roadmap_nodes.length-1] by 1
              node = roadmap_nodes[ii]
              if (node.key.indexOf("side_quest") > -1)
                if (node.key.indexOf("switch") > -1)
                  if roadmap_params.length < 3
                    node.state = 'active'
                    roadmap_params.push(node)


            packer.add(roadmap_params)

        )

      if ($achievement_roadmap? and $ach_data = me_page['achievement_roadmap'])
        packer = Packers($achievement_roadmap)
        roadmap_params = []
        roadmap = new Roadmap()
        roadmap.set_nodes($ach_data, false)
        roadmap_nodes = roadmap.get_nodes()

        active_node = null
        # try puzzle progression first
        for ii in [0..roadmap_nodes.length-1] by 1
          if roadmap_nodes[ii].key == "ten_tools"
            if roadmap_nodes[ii].state == "active"
              active_node = ii
            roadmap_params.push(roadmap_nodes[ii])

        next_level = roadmap_params.length + 1
        lab_todo = {image:"/puzzle-progression/badges/badge_lab_unlocked.png", title:"Participate in real experiments", desc:"Participate in the current RNA design experiments", verb:"Explore", width:128, height:128, link:"/web/labs/explore/", key:"ten_tools", state:"inactive", node_key:"ten_tools_lab_access", level:next_level}
        if (Application.GLOBAL_THEME_PARAMETERS['is_lab_member'] == true)
          lab_todo['state'] = "active"
          if roadmap_params[roadmap_params.length-1].state == "cleared"
            active_node = roadmap_params.length 
        roadmap_params.push(lab_todo)


        packer.add(roadmap_params)
        @init_roadmap_slick(active_node)
        @show_roadmap_status(roadmap_params, active_node)



      #if ($lab_cards_map? && lab_cards_map = me_page['achievement_roadmap'])
      #
      #  # hide for now
      #  $lab_cards_panel = @get_element("lab-cards-panel")
      #  $lab_cards_panel.hide()
      #  $lab_member_panel.css({'margin-top':'-11px'})


      if ($side_quest_roadmap?)
        $side_quest_roadmap.fadeTo(0, 0) 
        if $loading = @get_element("loading-side-projects")
          $loading.show()
        PageData.get_side_project_roadmap((data) =>
          if ($side_projects = data['achievement_roadmap'])
            packer = Packers($side_quest_roadmap)
            roadmap_params = []
            roadmap = new Roadmap()
            roadmap.set_nodes($side_projects, false, ach_type = "side-quests")
            roadmap_nodes = roadmap.get_nodes()

            # check for side quests
            for ii in [0..roadmap_nodes.length-1] by 1
              node = roadmap_nodes[ii]
              if (node.key.indexOf("side_quest") > -1)
                if (node.state == "active")
                  roadmap_params.push(node)
                else if (node.state == "cleared" and node.level == node.maxlevel)
                  roadmap_params.push(node)	    
                else if (params['display_all_sp']?)
                  #if node.level == 1
                  node.state = "active"
                  roadmap_params.push(node)

            if roadmap_params.length > 0
              packer.add(roadmap_params)
              if $loading = @get_element("loading-side-projects")
                $loading.hide()
              $side_quest_roadmap.fadeTo(300, 1)
            else
              $side_quest_roadmap_panel = @get_element("side-quest-roadmap-panel")
              $side_quest_roadmap_panel.hide()
        )

      if ($achievements? and achievements = me_page["achievements"])
        packer = Packers($achievements)
        achievements_params = []
        jj = 0
        for own key, ach of achievements
          jj++
          aparams = {}
          aparams["img"] = ach["image"]
          aparams["name"] = ach["title"]
          aparams["desc"] = ach["desc"]
          aparams["past"] = ach["past"]
          if jj > 7
            break
            #aparams['display'] = "none"
          achievements_params.push(aparams)
          
        packer.add(achievements_params)

      @init_home_page_slick()

      if $newsfeed?
        @build_newsfeed(me_page, $newsfeed, params)

      if Application.CURRENT_USER['Survey'].indexOf("EULA_Agree") < 0
        block = Blocks("follow-survey-box");
        $overlay_slot = Overlay.get_slot("follow-survey-box-surveys");
        Overlay.load_overlay_content("follow-survey-box-surveys");
        Overlay.show();
        block.add_block($overlay_slot, params);
            
    )


  clear_notifications : () ->

    document.title = "Eterna - Invent Medicine"

    if $menu_item = $("a#menu-item-newsfeed")
      $menu_item.removeClass("notification")

    post_params = {}
    post_params['type'] = "notification_read"
    AjaxManager.query("POST", Application.POST_URI, post_params, (response) =>
      EternaUtils.process_response(response, (data) =>
      )      
    )


  build_newsfeed : (me_page, $newsfeed, params) ->

    @clear_notifications()

    pageindex = 1 

    if params['sort']? and params['sort'] == 'date'
      status = @newsfeed_chronology_generate(me_page, $newsfeed, pageindex)

    else
    
      if notis_data = me_page["notifications"]
        @notification_generate(notis_data, $newsfeed)  
                
      if newsfeed_data = me_page["newsfeeds"]
        @news_generate(newsfeed_data, $newsfeed)
      
      if blogs_data = me_page["blogslist"]
        @blogs_generate(blogs_data, $newsfeed)
        
      if rewards_data = me_page["rewards"]
        @rewards_generate(rewards_data, $newsfeed)
      
      if groups_data = me_page["groups"]
        @groups_generate(groups_data, $newsfeed)
      
    if my_labs_statistics = me_page["my_labs_statistics"]
      if $my_labs_statistics = @get_element("my-labs-statistics")
        packer = Packers($my_labs_statistics)
        for mylab in my_labs_statistics
          mylab['thumbnail'] = EternaUtils.get_puzzle_middle_thumbnail(mylab['nid'])
        packer.add(my_labs_statistics)
    else
      if $my_labs_statistics = @get_element("my-labs")
        $my_labs_statistics.css("display","none")      
    
    me = this
    if $more_message = @get_element("more-message")
      $more_message.click(() ->
        $more_loading = me.get_element("more-loading")
        $more_loading.show()
        if params['filter'] == "all" and params['sort']? and params['sort'] == 'date'
          PageData.get_newsfeed(0, params['filter'], (++pageindex)*16, (data) =>           
            $newsfeed = me.get_element("newsfeed")      
            status = me.newsfeed_chronology_generate(data, $newsfeed, pageindex)
            if status == false
              $more_message.hide()
            else
              $more_message.show()
            $more_loading.hide()        
          )
        else
          PageData.get_newsfeed(pageindex++, params['filter'], 4, (data) =>           
            $newsfeed = me.get_element("newsfeed")
            if no_data = data["notifications"]
              me.notification_generate(no_data, $newsfeed)
            if ne_data = data["newsfeeds"]
              me.news_generate(ne_data, $newsfeed)
            if bl_data = data["blogslist"]
              me.blogs_generate(bl_data,$newsfeed)
            if re_data = data["rewards"]
              me.rewards_generate(re_data,$newsfeed)        
            if go_data = data["groups"]
              me.groups_generate(go_data, $newsfeed)
          
            if !no_data && !ne_data && !bl_data && !re_data && !go_data
              $more_message.hide()
            else
              $more_message.show()                             
            $more_loading.hide()           
          )
      )
    if $all = @get_element("all")
      $all.click(() ->
        params['filter'] = "all"
        if params['sort']? and params['sort'] == 'date'
          me.set_clickable(params['filter'])
          $newsfeed.html("")
          me.build_newsfeed(me_page, $newsfeed, params) 
        else
          pageindex=1
          me.filter_clicked("all")
      )
    if $messages = @get_element("messages")
      $messages.click(() -> 
        pageindex=1
        me.filter_clicked("notifications")
        params['filter'] = "notifications"
        params['size'] = "4"
      )
    if $newsmyfeeds = @get_element("news")
      $newsmyfeeds.click(() ->
        pageindex=1
        me.filter_clicked("news")
        params['filter'] = "news"
        params['size'] = "4"
      )          
    if $blogs = @get_element("blogs")
      $blogs.click(() ->
        pageindex=1
        me.filter_clicked("blogs")
        params['filter'] = "blogs"
        params['size'] = "4"
      )
    if $rewards = @get_element("rewards")
      $rewards.click(() ->
        pageindex=1
        me.filter_clicked("rewards")
        params['filter'] = "rewards"  
        params['size'] = "4"
      )
    if $groups = @get_element("groups")
      $groups.click(() =>
        pageindex=1
        me.filter_clicked("groups")
        params['filter'] = "groups"
        params['size'] = "4"
      )

  survey_clicked : (y) ->
    if $("#agree_button").prop("disabled") == false
      Me.update_survey(Application.CURRENT_USER['uid'], "EULA_Agree", (data) =>
      );
      Overlay.hide();
      #window.location = "https://gse.qualtrics.com/SE/?SID=SV_dhFfLYOLLjr4NBr";

  survey_clicked_no : (y) ->
    Me.update_survey(Application.CURRENT_USER['uid'], "No", (data) =>
    );
    Overlay.hide();
    

  filter_clicked : (filter) ->          
    $newsfeed = @get_element("newsfeed")
    $newsfeed.html("")
    $more_loading = @get_element("more-loading")
    $more_loading.show() 
    $more_message = @get_element("more-message")
    $more_message.show() 
    PageData.get_newsfeed(0, filter, 4, (data) =>  
      if no_data = data['notifications']
        @notification_generate(no_data, $newsfeed)
      if ne_data = data['newsfeeds']
        @news_generate(ne_data, $newsfeed)
      if bl_data = data['blogslist']
        @blogs_generate(bl_data, $newsfeed)    
      if re_data = data['rewards']
        @rewards_generate(re_data, $newsfeed)
      if go_data = data['groups']
        @groups_generate(go_data, $newsfeed)
      @set_clickable(filter)
      $more_loading.hide()
    )    

  set_clickable : (filter) ->
    $all = @get_element("all")
    $messages = @get_element("messages")
    $news = @get_element("news")
    $blogs = @get_element("blogs")
    $rewards = @get_element("rewards")
    $groups = @get_element("groups")
    $all.attr("style", "")
    $messages.attr("style", "")
    $news.attr("style", "")
    $blogs.attr("style", "")
    $rewards.attr("style","")
    $groups.attr("style","")
    style = "font-weight: bold; text-decoration:underline;"
    if filter == "all"
      $all.attr("style", style)
    if filter == "notifications" 
      $messages.attr("style", style)
    if filter == "news" 
      $news.attr("style", style)
    if filter == "blogs"
      $blogs.attr("style", style)
    if filter == "rewards"
      $rewards.attr("style", style)
    if filter == "groups"
      $groups.attr("style", style)



  newsfeed_chronology_generate : (me_page, $newsfeed, pageindex) ->

    feed_data = []

    nitems = pageindex * 16
    nskip = (pageindex-1) * 16
    if nskip > 0
      nskip++

    if notis_data = me_page["notifications"]
      for notification in notis_data          
        message_array = notification['message']
        for jj in [0..message_array.length-1]
          msg_obj = @parse_notification_message(notification, message_array, jj)
          msg_obj['timestamp'] = parseInt(msg_obj['timestamp'])
          msg_obj['block_type'] = "newsfeed-noti"
          feed_data.push(msg_obj)
          if jj >= nitems
            break

    if newsfeed_data = me_page["newsfeeds"]
      for ii in [0..newsfeed_data.length-1] by 1
        body = EternaUtils.format_summary(newsfeed_data[ii]['body'], 250)
        feed_data.push({
          nid:newsfeed_data[ii]['nid'],
          title:newsfeed_data[ii]['title'],
          body:body,
          sticky:parseInt(newsfeed_data[ii]['sticky']) > 0,
          timestamp:parseInt(newsfeed_data[ii]['timestamp']),
          block_type:"newsfeed-news"
        })
        if ii >= nitems
          break


    if blogs_data = me_page["blogslist"]
      for ii in [0..blogs_data.length-1] by 1
        body = EternaUtils.format_summary(blogs_data[ii]['body'], 250)
        feed_data.push({
          nid:blogs_data[ii]['nid'],
          title:blogs_data[ii]['title'],
          body:body,
          sticky:parseInt(blogs_data[ii]['sticky']) > 0,
          timestamp:parseInt(blogs_data[ii]['timestamp']),
          block_type:"blogs-list"
        })         
        if ii >= nitems
          break

    if rewards_data = me_page["rewards"]
      for ii in [0..rewards_data.length-1] by 1
        rewards_data[ii]['timestamp'] = parseInt(rewards_data[ii]['timestamp'])
        rewards_data[ii]['block_type'] = "newsfeed-reward"
        feed_data.push(rewards_data[ii])
        if ii >= nitems
          break
      
    if groups_data = me_page["groups"]      
      for notification in groups_data
        message_array = notification['message']
        for jj in [0..message_array.length-1] by 1
          message_obj = @parse_groups_message(notification, message_array, jj)
          message_obj['timestamp'] = parseInt(message_obj['timestamp'])
          message_obj['block_type'] = "newsfeed-groups"
          feed_data.push(message_obj)
          if jj >= nitems
            break

    if feed_data.length < 1
      return false

    feed_chrono = feed_data.slice(0)
    feed_chrono.sort((a, b) ->
      if a.timestamp > b.timestamp
        return -1
      if a.timestamp < b.timestamp
        return 1
      return 0
    )
      
    if nitems > feed_chrono.length
      nitems = feed_chrono.length
      
    for ii in [nskip..nitems-1] by 1
      block = Blocks(feed_chrono[ii]['block_type'])
      feed_item = block.add_block($newsfeed, feed_chrono[ii])

      if feed_chrono[ii]['block_type'] == "newsfeed-noti"
        notification = feed_chrono[ii]
        if $reply_button = feed_item.get_element("reply-button")
          do (notification) ->
            $reply_button.click(() ->
              nid = notification['nid']
              if notification['target_uid'] == Application.CURRENT_USER['uid']
                  target_uid = notification['target2_uid']
              else
                  target_uid = notification['target_uid']
                
              if $reply_body = $("."+nid).find("#reply-body")
                content = Utils.markup(Utils.to_html($reply_body.attr("value")))  
                Overlay.set_loading("replying..")
                Overlay.show()
                Me.reply(target_uid, content, nid, (data) =>
                  if data['success']
                    window.location.reload(true)
                  else
                    Utils.display_error("Could not perform notification action : " + data['error'])
                    Overlay.hide()
                ) 
            ) 
        if $mark_as_read = feed_item.get_element("mark-as-read")
          do () ->
            $mark_as_read.click(() ->
              noti_count = Application.GLOBAL_THEME_PARAMETERS['noti_count'] 
              Application.GLOBAL_THEME_PARAMETERS['noti_count'] = noti_count - 1
            )
        
    return true
    

  news_generate : (newsfeed_data, $newsfeed) ->
    news_block = Blocks("newsfeed-news")
    for ii in [0..newsfeed_data.length-1] by 1
      body = EternaUtils.format_summary(newsfeed_data[ii]['body'], 250)
      news_block.add_block($newsfeed, {nid:newsfeed_data[ii]['nid'], title:newsfeed_data[ii]['title'], body:body, sticky:parseInt(newsfeed_data[ii]['sticky']) > 0})

  blogs_generate : (blogs_data, $newsfeed) ->
    blogs_block = Blocks("blogs-list")
    for ii in [0..blogs_data.length-1] by 1
      body = EternaUtils.format_summary(blogs_data[ii]['body'], 250)
      blogs_block.add_block($newsfeed, {nid:blogs_data[ii]['nid'], title:blogs_data[ii]['title'], body:body, sticky:parseInt(blogs_data[ii]['sticky']) > 0})         

  rewards_generate : (rewards_data, $newsfeed) ->
    reward_block = Blocks("newsfeed-reward")
    for ii in [0..rewards_data.length-1] by 1
      reward_block.add_block($newsfeed, rewards_data[ii])

  parse_groups_message : (notification, message_array, index) ->
    message = message_array[index]
    sender_uid = message['sender']
    time = new Date message['created']*1000
    timestring = time.toDateString()
    if sender_uid == notification['target_uid']
      img = EternaUtils.get_user_picture(notification['target_picture'])
      sender_name = notification['target_name']
      target_name = notification['target2_name']
      target_uid = notification['target2_uid']
    else
      img = EternaUtils.get_user_picture(notification['target2_picture'])
      sender_name = notification['target2_name']
      target_name = notification['target_name']
      target_uid = notification['target_uid'] 
    type = message['type']
    msg_obj = {}
    msg_obj["nid"] = notification['nid']
    msg_obj["img"] = img
    msg_obj["created_time"] = timestring
    msg_obj["timestamp"] = message['created']

    if type == "comment"
      msg_obj["ids"] = sender_name;
      msg_obj["body"] = message['content']['body']             
      if node = message['content']['node']
        node_type = node['node_type']
        msg_obj['node_id'] = node['id'] 
        msg_obj['node_url'] = "/web/group/"+msg_obj['node_id']+"/"
        msg_obj['node_title'] = node['title']
        msg_obj['node_type'] = node_type
        msg_obj['node_comment'] = true
    else if type == "group_message"
      if message['content']['group']?
        msg_obj["ids"] = "Group Message from " + message['content']['group'] 
        msg_obj["body"] = message['content']['body']
      else
        msg_obj["ids"] = sender_name + "&nbsp;&rarr;&nbsp;" + target_name
        msg_obj["body"] = message['content']
    return msg_obj

  groups_generate : (groups_data, $newsfeed) ->
    if groups_data?
      groups_block = Blocks("newsfeed-groups")
      for notification in groups_data
        message_array = notification['message']
        for jj in [0..message_array.length-1]
          message_obj = @parse_groups_message(notification, message_array, jj)
          groups_block.add_block($newsfeed, message_obj)


  parse_notification_message : (notification, message_array, index) ->
    message = message_array[index]
    sender_uid = message['sender']
    time = new Date message['created']*1000
    timestring = time.toDateString()
    if sender_uid == notification['target_uid']
      img = EternaUtils.get_user_picture(notification['target_picture'])
      sender_name = notification['target_name']
      target_name = notification['target2_name']
      target_uid = notification['target2_uid']
    else
      img = EternaUtils.get_user_picture(notification['target2_picture'])
      sender_name = notification['target2_name']
      target_name = notification['target_name']
      target_uid = notification['target_uid'] 
    type = message['type']
    msg_obj = {}
    msg_obj["nid"] = notification['nid']
    msg_obj["target_uid"] = notification['target_uid']
    msg_obj["target2_uid"] = notification['target2_uid']
    msg_obj["img"] = img
    msg_obj["created_time"] = timestring
    msg_obj["timestamp"] = message['created']

    if type == "message"
      msg_obj["ids"] = "<a href=\"/web/player/" + sender_uid + "/\">" + sender_name + "</a>" + "&nbsp;&rarr;&nbsp;" + "<a href=\"/web/player/" + target_uid + "/\">" + target_name + "</a>"
      msg_obj["body"] = message['content']
      if index == message_array.length-1
        msg_obj["show_reply_button"] = true
        msg_obj["can_reply"] = true 
      else
        msg_obj["display"] = "none"
    else if type == "comment"
      msg_obj["ids"] = "<a href=\"/web/player/" + sender_uid + "/\">" + sender_name + "</a>"
      msg_obj["body"] = message['content']['body']
      msg_obj["body"] = EternaUtils.format_comment_mentions(msg_obj["body"])
      #for old interface
      if puzzle = message['content']['puzzle']
        message['content']['node'] = {}
        message['content']['node']['id'] = puzzle['id']
        message['content']['node']['title'] = puzzle['title']
        message['content']['node']['node_type'] = "puzzle"
      if node = message['content']['node']         
        msg_obj['node_id'] = node['id']
        msg_obj['node_title'] = node['title']
        node_type = node['node_type']
        msg_obj['node_type'] = node_type
        if node_type == "puzzle" then msg_obj['node_url'] = "/web/puzzle/"+msg_obj['node_id']+"/"
        if node_type == "lab" then msg_obj['node_url'] = "/web/lab/"+msg_obj['node_id']+"/"
        #if node_type == "lab" then msg_obj['node_url'] = "/game/browse/"+msg_obj['node_id']+"/"
        if node_type == "news" then msg_obj['node_url'] = "/web/news/"+msg_obj['node_id']+"/"
        #if node_type == "group" then msg_obj['node_url'] = "/web/group/"+msg_obj['node_id']+"/"
        if node_type == "eterna_group" then msg_obj['node_url'] = "/web/group/"+msg_obj['node_id']+"/"
        if node_type == "blog" then msg_obj['node_url'] = "/web/blog/"+msg_obj['node_id']+"/"
        if node_type == "solution" then msg_obj['node_url'] = "/game/browse/"+node['puzzle_id']+"/?filter1=Id&filter1_arg1="+msg_obj['node_id']+"&filter1_arg2="+msg_obj['node_id'];              
        msg_obj['node_comment'] = true
        if message['content']['mention_alert']?
          msg_obj['mention_alert'] = true
        if message['content']['moderator_alert']?
          msg_obj['moderator_alert'] = true
    else if type == "commentnote"
      msg_obj["ids"] = "<a href=\"/web/player/" + sender_uid + "/\">" + sender_name + "</a>"
      content = message['content']
      if content['node_type'] == "puzzle"
        msg_obj["body"] = ""
        msg_obj['puzzle'] = true
        msg_obj["puzzle_id"] = content["nid"]
        msg_obj["puzzle_title"] = content["title"]
      else if content['node_type'] == "solution"
        msg_obj["body"] = "commented on the lab design"

    return msg_obj    

  notification_generate : (notis_data, $newsfeed) ->
    if notis_data?
      noti_block = Blocks("newsfeed-noti")
      for notification in notis_data          
        message_array = notification['message']
        for jj in [0..message_array.length-1]
          msg_obj = @parse_notification_message(notification, message_array, jj)
               
          noti = noti_block.add_block($newsfeed, msg_obj)
          if $reply_button = noti.get_element("reply-button")
            do (notification) ->
              $reply_button.click(() ->
                nid = notification['nid']
                if notification['target_uid'] == Application.CURRENT_USER['uid']
                  target_uid = notification['target2_uid']
                else
                  target_uid = notification['target_uid']
                
                if $reply_body = $("."+nid).find("#reply-body")
                  content = Utils.markup(Utils.to_html($reply_body.attr("value")))  
                  Overlay.set_loading("replying..")
                  Overlay.show()
                  Me.reply(target_uid, content, nid, (data) =>
                    if data['success']
                      window.location.reload(true)
                    else
                      Utils.display_error("Could not perform notification action : " + data['error'])
                      Overlay.hide()
                    ) 
                ) 
          if $mark_as_read = noti.get_element("mark-as-read")
            do (notification) ->
              $mark_as_read.click(() ->
                noti_count = Application.GLOBAL_THEME_PARAMETERS['noti_count'] 
                Application.GLOBAL_THEME_PARAMETERS['noti_count'] = noti_count - 1
              )


  show_roadmap_status: (roadmap_params, active_node) ->

    if active_node == null
      return
    if (!(roadmap_params?) or roadmap_params.length < 1)
      return

    curr_ach = parseInt(roadmap_params[active_node].level)
    progress = roadmap_params[active_node].progress
    
    if curr_ach? and (Application.GLOBAL_THEME_PARAMETERS['is_lab_member'] != true)
      if $title = @get_element("status_tracker_header")
        if curr_ach < 9
          span_n = "<span class='tool-count-box'>"
          span_n += (10 - curr_ach + 1)
          span_n += "</span>"
          $title.html("Earn " + span_n + " more tools to start real experiments")
          #$title.html("Earn " + span_n + " more tools to access lab projects")
        else
          span_n = "<span class='tool-count-box'>1</span>"
          $title.html("Earn " + span_n + " more tool to start real experiments")
          #$title.html("Earn " + span_n + " more tool to access lab projects")
    
    if curr_ach?
      for ii in [0..curr_ach-1] by 1
         
        if $thumbnail = @get_element("status_thumbnail_#{ii}")
          $thumbnail.removeClass("deactive_thumbnail").addClass("cleared_thumbnail")
          if (ii > 0)
            prev_ach_title = roadmap_params[ii-1].title
            search = "%5B" + prev_ach_title + "%5D"
            search = search.replace(/\s/g, "%20")
            puzlink = "/web/progression/?size=24&search="+search+"&sort=date"

            span_title = "<span>"+prev_ach_title+"</span>"
            #$thumbnail.html("<a href="+puzlink+" class='info-title'>"+span_title+$thumbnail.html()+"</a>")     
            #$thumbnail.html("<a href='' class='info-title'>"+span_title+$thumbnail.html()+"</a>")     
 
        if $bar = @get_element("status_bar_#{ii}")
          $bar.css('background-color', '#3192ac')

      if $curr_thumbnail = @get_element("status_thumbnail_#{curr_ach}")
        curr_link = roadmap_params[active_node].link
        span_title = "<span>"+roadmap_params[active_node].title+"</span>"
        $curr_thumbnail.removeClass("deactive_thumbnail").addClass("active_thumbnail")
        #$curr_thumbnail.html("<a href="+curr_link+" class='info-title'>"+span_title+$curr_thumbnail.html()+"</a>")
        #$curr_thumbnail.html("<a href='' class='info-title'>"+span_title+$curr_thumbnail.html()+"</a>")     

        #$curr_thumbnail.attr("src","/puzzle-progression/ten_tools_tracker/active-"+ii+".png")

      if $prev_bar = @get_element("status_bar_#{curr_ach}")
        $prev_bar.removeClass("long_progress_bar").addClass("prev_progress_bar")
        $prev_bar.css('background-color','#3192ac')

      if $curr_bar = @get_element("status_bar_#{curr_ach}")
        $curr_bar.removeClass("long_progress_bar").addClass("curr_progress_bar")
        if progress >= 100
          $curr_bar.css('background-color','#3192AC')
        else
          $curr_bar.css('background','linear-gradient(left, #3192ac +'+progress+'%,#cccccc '+progress+'%)')
          $curr_bar.css('background','-webkit-linear-gradient(left, #3192ac +'+progress+'%,#cccccc '+progress+'%)')
          $curr_bar.css('background','-moz-linear-gradient(left, #3192ac +'+progress+'%,#cccccc '+progress+'%)')
          $curr_bar.css('background','-o-linear-gradient(left, #3192ac +'+progress+'%,#cccccc '+progress+'%)')

    for ii in [1..10] by 1
      if $thumbnail = @get_element("status_thumbnail_#{ii}") 
        title = roadmap_params[ii-1].title
        $thumbnail.html("<a href='#status_tracker_header' class='info-title'><span>"+title+"</span>"+$thumbnail.html()+"</a>")
        
    if $thumbnail = @get_element("status_thumbnail_#{1}") 
      $thumbnail.on("mouseenter", () =>
        $('.achievement-roadmap').slick('slickGoTo', 0)
      )
    if $thumbnail = @get_element("status_thumbnail_#{2}") 
      $thumbnail.on("mouseenter", () =>
        $('.achievement-roadmap').slick('slickGoTo', 1)
      )
    if $thumbnail = @get_element("status_thumbnail_#{3}") 
      $thumbnail.on("mouseenter", () =>
        $('.achievement-roadmap').slick('slickGoTo', 2)
      )
    if $thumbnail = @get_element("status_thumbnail_#{4}") 
      $thumbnail.on("mouseenter", () =>
        $('.achievement-roadmap').slick('slickGoTo', 3)
      )
    if $thumbnail = @get_element("status_thumbnail_#{5}") 
      $thumbnail.on("mouseenter", () =>
        $('.achievement-roadmap').slick('slickGoTo', 4)
      )
    if $thumbnail = @get_element("status_thumbnail_#{6}") 
      $thumbnail.on("mouseenter", () =>
        $('.achievement-roadmap').slick('slickGoTo', 5)
      )
    if $thumbnail = @get_element("status_thumbnail_#{7}") 
      $thumbnail.on("mouseenter", () =>
        $('.achievement-roadmap').slick('slickGoTo', 6)
      )
    if $thumbnail = @get_element("status_thumbnail_#{8}") 
      $thumbnail.on("mouseenter", () =>
        $('.achievement-roadmap').slick('slickGoTo', 7)
      )
    if $thumbnail = @get_element("status_thumbnail_#{9}") 
      $thumbnail.on("mouseenter", () =>
        $('.achievement-roadmap').slick('slickGoTo', 8)
      )
    if $thumbnail = @get_element("status_thumbnail_#{10}") 
      $thumbnail.on("mouseenter", () =>
        $('.achievement-roadmap').slick('slickGoTo', 9)
      )
		    


  init_home_page_slick : () ->
    $('.home-page-slick').slick({
      variableWidth:true,
      infinite:true,
      slidesToScroll:1,
      autoplay:true,
      autoplaySpeed:7000,
      pauseOnFocus:true,
      pauseOnHover:true,
      initialSlide:0,
      centerMode:true,
      dots:true,
      #speed:400
    })


  init_roadmap_slick : (active_node) ->

    init_slide = active_node
    if init_slide < 0
      init_slide = 0

    $('.achievement-roadmap').slick({
      variableWidth:true,
      infinite:false,
      slidesToScroll:1,
      initialSlide:init_slide,
      centerMode:true,
      centerPadding:'40px',
      speed:400
    })
       
    $('.slick-slide').css({'width':'230px','padding':'5px'})
    $('.slick-slider').css({'width':'720px','height':'327px'})
    #$('.slick-track').css({'left':'-480px'})
    $('.slick-arrow').css({
      'z-index':'2000',
    })
    $('.slick-prev').css({'left':'330px',top:'115%'})
    $('.slick-next').css({'right':'330px',top:'115%'})

    $('.achievement-roadmap').slick('slickGoTo', init_slide, true)
    
    this2 = this
    this2.init_achievement_descriptions()
    $('.achievement-roadmap').on("afterChange", (event, slick, currentSlide) =>
      this2.init_achievement_descriptions()
    )


  init_achievement_descriptions : (currentSlide) ->
    currentSlide = $('.achievement-roadmap').slick('slickCurrentSlide')
    if $info = $("[data-slick-index='"+currentSlide+"']").find(".info-description-left")
      $info.removeClass("info-description-left").addClass("info-description")

    prevSlide = parseInt(currentSlide) - 1
    if $info = $("[data-slick-index='"+prevSlide+"']").find(".info-description-left")
      $info.removeClass("info-description-left").addClass("info-description")

    nextSlide = parseInt(currentSlide) + 1
    if $info = $("[data-slick-index='"+nextSlide+"']").find(".info-description")
      $info.removeClass("info-description").addClass("info-description-left")


  agree_check : () ->
    if $("#agree_13").attr("checked") && $("#agree_terms").attr("checked") && $("#agree_respect").attr("checked")
      $("#agree_button").prop("disabled", false);
      $("#agree_button").css("cursor","pointer")
      $("#agree_button").removeClass("gray-button");
      $("#agree_button").addClass("green-button");
    else if $("#agree_button").prop("disabled") == false
      $("#agree_button").prop("disabled", true);
      $("#agree_button").css("cursor","default")
      $("#agree_button").removeClass("green-button");
      $("#agree_button").addClass("gray-button");

    



class @BuilderFollowOverlay extends Builder
  on_build : (block, $container, params) ->

    ThemeCompiler.compile_block(block,params,$container)
    @generate_follow(params['title'], params['follow_type'], @get_element("follow_info"))
  generate_follow : (block_title, follow_type, $follow_info) ->
    $loading = @get_element("loading")
    $loading.show()
    Follow.get_follows(follow_type, (follows) =>
        follows = follows['follows']
        $follow_info.html("")
        if follows.length == 0
          $follow_info.html("No " + block_title)
        else  
          packer = Packers($follow_info)
          follow_params = []
          for follow in follows
            follow_info = follow['followee_info']
            if follow_type == "puzzles"
              follow_params.push({puzzle_title:follow_info['title'], puzzle_id:follow['id']})
            if follow_type == "users"
              follow_params.push({user_name:follow_info['name'], user_picture:EternaUtils.get_user_picture(follow_info['picture']), uid:follow['id']})
            if follow_type == "groups"
              follow_params.push({group_title:follow_info['title'], group_id:follow['id']})              
          packer.add(follow_params)
        $loading.hide()
    , 
      (error) =>
        alert error
    )
