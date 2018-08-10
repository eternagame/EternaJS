class @BuilderNewsPage extends Builder
  on_build : (block, $container, params) ->
    Application.track_google_analytics_event("news","open", "");
    nid = params['nid']

    if !(nid?)
      Utils.display_error("nid not specified")
      return

    PageData.get_news(nid, (page) =>
      news = page['news']

      input_params = {}
      input_params['title'] = news['title']
      input_params['created'] = news['created']
      input_params['body'] = EternaUtils.format_body(news['body'])
      input_params['comments'] = page['comments']
      input_params['nid'] = nid
      ThemeCompiler.compile_block(block,input_params,$container)

      if page['follow']? && page['follow'][0]?
        @show_unfollow()
      else
        @show_follow()

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

class @BuilderNewsList extends Builder

  on_build : (block, $container, params) ->

    skip = params['skip']
    size = params['size']
    search = params['search']

    if !(skip?)
      skip = 0
    if !(size?)
      size = 20

    if Utils.is_text_empty(search)
      search = null

    PageData.get_newslist(skip, size, search, (page) =>

      newslist = page["newslist"]
      ThemeCompiler.compile_block(block,params,$container)

      $newslist = @get_element("newslist")
      packer = Packers($newslist)
      news_params = []

      for ii in [0..newslist.length-1] by 1
        body = EternaUtils.format_summary(newslist[ii]['body'], 180)
        news_params.push({nid:newslist[ii]['nid'], title:newslist[ii]['title']+" ("+newslist[ii]['commentcount']+")", body:body, created:newslist[ii]['created'], sticky:parseInt(newslist[ii]['sticky']) > 0})

      packer.add(news_params)

      total_news = page["num_news"]

      if $pager = @get_element("pager")
        pager_str = EternaUtils.get_pager(Math.floor(skip/size), Math.ceil(total_news/size), (pageindex) =>
          url_params = {skip:pageindex * size, size:size}
          if search?
            url_params['search'] = search
          return "/web/news/?" + Utils.generate_parameter_string(url_params, true)
        )

        $pager.html(pager_str)

      if $search = @get_element("search")
        $search.attr("value", search)

        $search.keyup((e) =>
          if e.keyCode == KeyCode.KEYCODE_ENTER
            search = $search.attr("value")
            url = "/web/news/?" + Utils.generate_parameter_string({search:search}, true)
            Utils.redirect_to(url)
        )

    )


class @BuilderRecentNews extends Builder
  on_build : (block, $container, params) ->

    PageData.get_newslist(0, 3, null,(page) =>
      newslist = page["newslist"]
      ThemeCompiler.compile_block(block,params,$container)

      if $newslist = @get_element("newslist")
        packer = Packers($newslist)
        news_params = []

        for ii in [0..newslist.length-1] by 1
          news_params.push({nid:newslist[ii]['nid'], title:newslist[ii]['title'], created:newslist[ii]['created']})
        packer.add(news_params)

    )


class @BuilderRecents extends Builder
  on_build : (block, $container, params) ->

    PageData.get_recents((page) =>
      newslist = page["news"]
      bloglist = page['blogs']
      ThemeCompiler.compile_block(block,params,$container)

      if $newslist = @get_element("newslist")
        packer = Packers($newslist)
        news_params = []
        for ii in [0..newslist.length-1] by 1
          #news_params.push({nid:newslist[ii]['nid'], title:newslist[ii]['title']+" (" + newslist[ii]['commentcount'] + ")", created:newslist[ii]['created'], type:'news'})
          news_params.push({nid:newslist[ii]['nid'], title:newslist[ii]['title'], created:newslist[ii]['created'], type:'news'})
        for ii in [0..bloglist.length-1] by 1
          #news_params.push({nid:bloglist[ii]['nid'], title:bloglist[ii]['title']+" (" + bloglist[ii]['commentcount'] + ")", created:bloglist[ii]['created'], type:'blog'})
          news_params.push({nid:bloglist[ii]['nid'], title:bloglist[ii]['title'], created:bloglist[ii]['created'], type:'blog'})

        packer.add(news_params)

    )
