class @BuilderBlogsList extends Builder

  on_build : (block, $container, params) ->
    Application.track_google_analytics_event("blog","open", "");
    skip = params['skip']
    size = params['size']
    search = params['search']

    if !(skip?)
      skip = 0
    if !(size?)
      size = 5

    PageData.get_blogslist(skip, size, search, (page) =>

      ThemeCompiler.compile_block(block,params,$container)

      $blogslist = @get_element("blogslist")
      if blogslist = page['blogslist']
        is_follower = page['is_follower']
        blogs_block = Blocks("blogsitem")
        for ii in [0..blogslist.length-1] by 1
          body = EternaUtils.format_body(blogslist[ii]['body'])
          if page['uid'] is blogslist[ii]['uid']
            editable = true
          else
            editable = false
          blogs_block.add_block($blogslist,{Editable:editable, nid:blogslist[ii]['nid'], title:blogslist[ii]['title'], body:body, created:blogslist[ii]['created'], sticky:parseInt(blogslist[ii]['sticky']) > 0, comments:blogslist[ii]['comments']})

          if(is_follower[ii])
            @show_unfollow(blogslist[ii]['nid'])
          else
            @show_follow(blogslist[ii]['nid'])

          if(editable and !is_follower[ii])
            Follow.follow(blogslist[ii]['nid'], "node", null, (data) =>
              if data['success']
                @show_unfollow(blogslist[ii]['nid'])
              else
                alert "Follow fail"
            )

          if $follow = @get_element(blogslist[ii]['nid']+"-follow")
            $follow.click((e) =>
              nid = e.target.id.split('-')[0]
              Overlay.set_loading("")
              Overlay.show()
              Follow.follow(nid, "node", null, (data) =>
                if data['success']
                  @show_unfollow(nid)
                else
                  alert "Follow fail"
                Overlay.hide()
              )
            )

          if $unfollow = @get_element(blogslist[ii]['nid']+"-unfollow")
            $unfollow.click((e) =>
              nid = e.target.id.split('-')[0]
              Overlay.set_loading("")
              Overlay.show()
              Follow.expire_follow(nid, "node", (data) =>
                if data['success']
                  @show_follow(nid)
                else
                  alert "Unfollow fail"
                Overlay.hide()
              )
            )

      total_blogs = page['num_blogs']

      if $pager = @get_element("pager")
        pager_str = EternaUtils.get_pager(Math.floor(skip/size), Math.ceil(total_blogs/size), (pageindex) =>
          url_params = {skip:pageindex * size, size:size}
          if search?
            url_params['search'] = search
          return "/web/blog/?" + Utils.generate_parameter_string(url_params, true)
        )

        $pager.html(pager_str)

      if $search = @get_element("search")
        $search.attr("value", search)

        $search.keyup((e) =>
          if e.keyCode == KeyCode.KEYCODE_ENTER
            search = $search.attr("value")
            url = "/web/blog/?" + Utils.generate_parameter_string({search:search}, true)
            Utils.redirect_to(url)
        )
    )

  show_unfollow : (nid) ->
    if $follow = @get_element(nid+"-follow")
      $follow.hide()
    if $unfollow = @get_element(nid+"-unfollow")
      $unfollow.show()

  show_follow : (nid) ->
    if $follow = @get_element(nid+"-follow")
      $follow.show()
    if $unfollow = @get_element(nid+"-unfollow")
      $unfollow.hide()

class @BuilderBlog extends Builder
  on_build : (block, $container, params) ->

    nid = params['nid']

    if !(nid?)
      Utils.display_error("nid not specified")
      return

    PageData.get_blogs(nid, (page) =>
      blog = page['blog']
      input_params = {}
      input_params['nid'] = nid
      input_params['title'] = blog['title']
      input_params['created'] = blog['created']
      input_params['body'] = EternaUtils.format_body(blog['body'])
      input_params['founder'] = blog['uid']
      input_params['comments'] = page['comments']
      if page['uid'] is blog['uid']
        input_params['Editable'] = true
      else
        input_params['Editable'] = false
      ThemeCompiler.compile_block(block,input_params,$container)

      if page['follow']? && page['follow'][0]?
        @show_unfollow()
      else
        @show_follow()

      if(input_params['Editable'])
        if !page['follow']? || !page['follow'][0]?
          Follow.follow(nid, "node", null, (data) =>
            if data['success']
              @show_unfollow()
            else
              alert "Follow fail"
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
  show_unfollow : () ->
    if $follow = @get_element("follow")
      $follow.hide()
    if $unfollow = @get_element("unfollow")
      $unfollow.show()

  show_follow : () ->
    if $follow = @get_element("follow")
      $follow.show()
    if $unfollow = @get_element("unfollow")
      $unfollow.hide()
