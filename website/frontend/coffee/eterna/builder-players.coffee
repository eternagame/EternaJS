class @BuilderPlayerPage extends Builder
  on_build : (block, $container, params) ->
    uid = params['uid']
    tab_type = params['tab_type']
    view_option = params['view_option']

    if !(uid?)
      Utils.display_error("Cannot find UID")
      return

    PageData.get_player(uid, tab_type, view_option, (page) =>
      user = page['user']

      input_params = {}
      input_params['uid'] = uid
      input_params['name'] = user['name']
      input_params['picture'] = EternaUtils.get_user_picture(user['picture'])
      input_params['rank'] = user['rank']
      input_params['points'] = if user['points'] then user['points'] else 0
      input_params['created'] = user['created']
      input_params['profile'] = EternaUtils.format_body(user['Profile'])

      if Application.CURRENT_USER?
        input_params['editable'] = uid == Application.CURRENT_USER.uid

      ThemeCompiler.compile_block(block,input_params,$container)

      @hide_all_active_tabs()
      @show_all_inactive_tabs()
      if $active_tab = @get_element(tab_type+"-active")
        $active_tab.show()
      if $inactive_tab = @get_element(tab_type+"-inactive")
        $inactive_tab.hide()

      if $showthumbs = @get_element("show_thumbnails")
        $showthumbs.click(()=>
          $hidethumbs.show().delay(300)
          $showthumbs.hide().delay(300)
          if $created_puzzle_thumbs = @get_element("created_puzzle_thumbs")
            $created_puzzle_thumbs.slideDown(300).delay(400);
        )

      if $hidethumbs = @get_element("hide_thumbnails")
        $hidethumbs.click(()=>
          $showthumbs.show().delay(300)
          $hidethumbs.hide().delay(300)
          if $created_puzzle_thumbs = @get_element("created_puzzle_thumbs")
            $created_puzzle_thumbs.slideUp(300).delay(400);
        )

      if (achievements = page["achievements"]) && ($achievements = @get_element("achievements"))
        packer = Packers($achievements)
        achievements_params = []
        for own key, ach of achievements
          # skip these
          if key in ["eterna1001", "eterna1002", "eterna1003", "eterna1004", "nova"]
            continue
          achievements_params.push({img:ach['image'], name:ach['title'], desc:ach['desc'], past:ach['past']})
        packer.add(achievements_params)

      if $latest_puzzles = @get_element("latest-puzzles")
        if latest_puzzles = page['latest_puzzles']
          packer= Packers($latest_puzzles)
          packer.add(latest_puzzles)

      if $created_puzzles = @get_element("created-puzzles")
        if created_puzzles = page['created_puzzles']
          packer= Packers($created_puzzles)
          packer.add(created_puzzles)

      if $created_labs = @get_element("created-labs")
        if created_labs = page['created_labs']
          packer = Packers($created_labs)
          packer.add(created_labs)

      if $created_puzzle_thumbs = @get_element("created_puzzle_thumbs")
        if page['created_puzzles']?
          counter_created_puzzles = page['created_puzzles'].length
          if counter_created_puzzles > 10
            $created_puzzle_thumbs.hide()
            $hidethumbs.hide()
            $showthumbs.show()
          else
            $created_puzzle_thumbs.show()
            $showthumbs.hide()
            $hidethumbs.show()
      if $cleared_puzzles = @get_element("cleared-puzzles")
        if cleared_puzzles = page['cleared_puzzles']
          packer= Packers($cleared_puzzles)
          packer.add(cleared_puzzles)
        if $solveddate = @get_element("solveddate")
          if params['view_option'] != "puzzledate" && params['view_option'] != "puzzlename" then $solveddate.attr("checked", true)
          $solveddate.click(()=>
            url = "/web/player/"+uid+"/cleared_puzzles/?view_option=solveddate"
            Utils.redirect_to(url)
          )
        if $puzzledate = @get_element("puzzledate")
          if params['view_option'] == "puzzledate" then $puzzledate.attr("checked", true)
          $puzzledate.click(()=>
            url = "/web/player/"+uid+"/cleared_puzzles/?view_option=puzzledate"
            Utils.redirect_to(url)
          )
        if $puzzlename = @get_element("puzzlename")
          if params['view_option'] == "puzzlename" then $puzzlename.attr("checked", true)
          $puzzlename.click(()=>
            url = "/web/player/"+uid+"/cleared_puzzles/?view_option=puzzlename"
            Utils.redirect_to(url)
          )

      if $synthesized_design = @get_element("synthesized-design")
        if synthesized_design = page['synthesized_design']
          packer= Packers($synthesized_design)
          packer.add(synthesized_design)

      if $synthesized = @get_element("synthesized")
        if synthesized = page['synthesized']
          if (synthesized?) && synthesized.length > 0
            for ii in [0..synthesized.length-1] by 1
              synthesized[ii]['item_url'] = "/game/browse/" + synthesized[ii]['puznid'] + "/?filter1=Id&filter1_arg1=" + synthesized[ii]['id'] + "&filter1_arg2=" + synthesized[ii]['id']
            if synthesized.length > 0
              packer = Packers($synthesized)
              packer.add(synthesized)
          else
            @get_element("synthesized-header").hide()

      if $my_group = @get_element("my-group")
        packer= Packers($my_group)
        if my_group = page['my_group']
          for ii in [0..my_group.length-1] by 1
            if uid is page['my_group'][ii]['founder']
              page['my_group'][ii]['group_title'] = "#{my_group[ii]['group_title']} (Owner)"
          packer.add(my_group)
        if my_pending_group = page['my_pending_group']
          for ii in [0..my_pending_group.length-1] by 1
            page['my_pending_group'][ii]['group_title'] = "#{my_pending_group[ii]['group_title']} (Pending)"
          packer.add(my_pending_group)

      if $sendmessage = @get_element("sendmessage")
        $sendmessage.click(()=>
          input = {target_name:user['name']}
          if Application.CURRENT_USER?
            block = Blocks("overlay-message")
          else
            block = Blocks("overlay-message-register")
            input['redirect_url'] = "/web/player/" + user['uid'] + "/?resume_pm=true"
          $overlay_slot = Overlay.get_slot("sendmessage")
          Overlay.load_overlay_content("sendmessage")
          Overlay.show()
          if block['template_context_variables_'] == null
            block.add_block($overlay_slot, input)
          )


      if Application.CURRENT_USER?
        if uid != Application.CURRENT_USER['uid'] && page['follow'].length == 0
          @show_follow()
        else if uid != Application.CURRENT_USER['uid']
          @show_unfollow()
        else
          @hide_follows()
      else
        @hide_follows()

      if $follow = @get_element("follow")
        $follow.click(() =>
          Overlay.set_loading("")
          Overlay.show()
          Follow.follow(uid, "user", null, (data) =>
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
          Follow.expire_follow(uid, "user", (data) =>
            if data['success']
              @show_follow()
            else
              alert "Unfollow fail"
            Overlay.hide()
            )
          )

      if params['resume_pm']?
        if $sendmessage = @get_element('sendmessage')
          $sendmessage.click()

      if $reset_progress = @get_element("reset-progress")
        if Application.CURRENT_USER? and Application.CURRENT_USER.uid == uid
          $reset_progress.show()
          $reset_progress.click(()=>
            PageData.reset_user_progress(uid)
          )
        else
          $reset_progress.hide()

      if $restore_progress = @get_element("restore-progress")
        if Application.CURRENT_USER? and Application.CURRENT_USER.uid == uid
          $restore_progress.show()
          $restore_progress.click(()=>
            PageData.restore_user_progress(uid)
          )
        else
          $restore_progress.hide()



    )


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

  hide_all_active_tabs : () ->
    if $about_active = @get_element("about-active")
      $about_active.hide()
    if $synthesized_active = @get_element("synthesized-active")
      $synthesized_active.hide()
    if $latest_active = @get_element("latest-active")
      $latest_active.hide()
    if $created_active = @get_element("created-active")
      $created_active.hide()
    if $cleared_active = @get_element("cleared-active")
      $cleared_active.hide()

  show_all_inactive_tabs : () ->
    if $about_inactive = @get_element("about-inactive")
      $about_inactive.show()
    if $synthesized_inactive = @get_element("synthesized-inactive")
      $synthesized_inactive.show()
    if $latest_inactive = @get_element("latest-inactive")
      $latest_inactive.show()
    if $created_inactive = @get_element("created-inactive")
      $created_inactive.show()
    if $cleared_inactive = @get_element("cleared-inactive")
      $cleared_inactive.show()


class @BuilderPlayer extends Builder
  on_build : (block, $container, params) ->

    input_params = {}
    input_params['uid'] = params['uid']
    input_params['name'] = params['name']
    input_params['picture'] = EternaUtils.get_user_picture(params['picture'])
    input_params['created'] = params['created']
    input_params['points'] = if params['points'] then params['points'] else 0
    input_params['synths'] = if params['synths'] then params['synths'] else 0
    input_params['rank'] = params['rank']

    ThemeCompiler.compile_block(block,input_params,$container)


class @BuilderPlayers extends Builder

  on_build : (block, $container, params) ->

    type = params['type']
    skip = params['skip']
    size = params['size']
    sort = params['sort']
    search = params['search']

    if !(sort?)
      sort = params['sort'] = "active"

    if !(skip?)
      skip = 0
    if !(size?)
      size = 50

    PageData.get_players(skip, size, sort, search, (page)=>
      @build_players(block, $container, params, page)
    )


  build_players : (block, $container, params, page) ->

    type = params['type']
    skip = params['skip']
    size = params['size']
    sort = params['sort']
    search = params['search']

    params['active_sort_url'] = "/web/players/?" + Utils.generate_parameter_string({size:size, search:search, sort:"active"})
    params['date_sort_url'] = "/web/players/?" + Utils.generate_parameter_string({size:size, search:search, sort:"date"})
    params['point_sort_url'] = "/web/players/?" + Utils.generate_parameter_string({size:size, search:search, sort:"point"})
    params['synthesizes_sort_url'] = "/web/players/?" + Utils.generate_parameter_string({size:size, search:search, sort:"synthesizes"})

    if skip?
      skip = parseInt(skip)

    if !(skip?)
      skip = 0
    if !(size?)
      size = 50

    players = page["users"]
    total_players = page["num_users"]

    ThemeCompiler.compile_block(block,params,$container)

    $players = @get_element("players")
    packer = Packers($players)
    player_params = []

    for ii in [0..players.length-1] by 1
      players[ii]['rank'] = ii + skip + 1
      player_params.push(players[ii])

    packer.add(player_params)

    total_puzzles = page["num_puzzles"]

    if $pager = @get_element("pager")
      pager_str = EternaUtils.get_pager(Math.floor(skip/size), Math.ceil(total_players/size), (pageindex) =>
        url_params = {skip:pageindex * size, size:size, sort:sort}
        if search?
          url_params['search'] = search
        return "/web/players/?" + Utils.generate_parameter_string(url_params, true)
      )

      $pager.html(pager_str)

    if $search = @get_element("search")
      $search.attr("value", search)

      $search.keyup((e) =>
        if e.keyCode == KeyCode.KEYCODE_ENTER
          search = $search.attr("value")
          url = "/web/players/?" + Utils.generate_parameter_string({search:search, sort:sort}, true)
          Utils.redirect_to(url)
      )

class @BuilderOverlayMessage extends Builder
  on_build : (block, $container, params) ->
    ThemeCompiler.compile_block(block,params,$container)
    if $send_button = @get_element("send-button")
      $send_button.click(()=>
        if $_body = @get_element("body")
          body = $_body.attr("value")
          body = Utils.markup(Utils.to_html(body))
          if Utils.is_text_empty(body)
            Utils.display_error("Please enter the message");
            return

          post_params = {}
          post_params['target_uid'] = params['uid']
          post_params['body'] = body
          post_params['notification_type'] = "message";
          post_params['workbranch'] = Page.get_current_page_parameters()['workbranch'];
          post_params['action'] = "add";
          post_params['type'] = "message";

          Overlay.set_loading("sending..");
          Overlay.show();

          AjaxManager.query("POST", Application.POST_URI, post_params, (response) =>
            EternaUtils.process_response(response, (data) =>
              $_body.attr("value","")
            )
          , (data) =>
              Utils.display_error("Could not send the message : " + data['errors'])
          )
          Overlay.hide()
      )

class @BuilderPlayerEdit extends Builder
  on_build : (block, $container, params) ->
    if Application.CURRENT_USER?
      params['uid'] = Application.CURRENT_USER['uid']
    PageData.get_player(params['uid'], null, null, (data) =>
        user = data['user']
        params['email'] = user['mail']
        params['profile'] = user['Profile']

        if user['Mail notification'] != undefined && user['Mail notification'] == "on"
          params['mail_notification'] = "checked"
        else
          params['mail_notification'] = ""

        if user['Blog mail notification'] != undefined && user['Blog mail notification'] == "on"
          params['blog_mail_notification'] = "checked"
        else
          params['blog_mail_notification'] = ""

        if user['News mail notification'] != undefined && user['News mail notification'] == "on"
          params['news_mail_notification'] = "checked"
        else
          params['news_mail_notification'] = ""

        ThemeCompiler.compile_block(block,params,$container)

        AjaxManager.query("GET", Application.GET_URI, {type:"edit_profile"}, (response) =>
          $form = response['data']['user_profile_form']
          if $test = @get_element("tokens")
            $test.html($form)
        , (data) =>
        )

        if $save = @get_element("save")
          $save.click(() =>
            if $profile_form_profile = @get_element("profile_form_profile")
              $profile_form_profile.submit()
            )
      , (data) =>
          alert JSON.stringify(data)
      )
