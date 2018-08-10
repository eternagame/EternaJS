class @BuilderDataBrowser extends Builder

  on_build: (block, $container, params) ->

    # check for puzzle data in new browser, else redirect to legacy browser
    @check_browser_for_puzzle(params)

    params = @init_data_browser_params(params)

    PageData.display_data_browser(params, (page) =>
      ThemeCompiler.compile_block(block,params,$container)
      if $("div[name=footer]")? then $("div[name=footer]").detach()
      if $("#pages")? then $("#pages").css("width", "100%")
      if $('body')? then $('body').css('background-image','none')
      
      $container.bind_window_event("message", (event) =>
        @on_request_from_iframe(event)
      )
   
      @update_iframe_size()
      $container.bind_window_event("resize", () =>
        @update_iframe_size()
      )	
    )      


  init_data_browser_params : (params) ->
    #params['mode'] = 'beta'
    #params['column']="Design_ID,Design_Name,Designer_Name,Sequence,Folding_Subscore,Baseline_Subscore,Switch_Subscore,Eterna_Score"
    return params
    

  on_request_from_iframe: (event) ->
    if event.originalEvent.data == "queryString?"
      if $iframe = @get_element("data-browser-iframe")
        $iframe[0].contentWindow.postMessage("queryString:" + window.location.search, "*")
          

  update_iframe_params: () ->
    if $iframe = @get_element("data-browser-iframe")
      url = $iframe.attr("src") + window.location.search
      $iframe.attr("src", url)


  update_iframe_size: () ->
    $('html, body').css('overflow', 'hidden')
    if $iframe = @get_element("data-browser-iframe")
      new_width = $(window).width()
      new_height = $(window).height() 
      if $top_bar = $('div#top-bar')
        new_height = $(window).height() - $top_bar.height() - 35
      $iframe.parent().height(new_height)
      $iframe.parent().width(new_width)
      $iframe.width('100%')
      $iframe.height('100%')
      

  check_browser_for_puzzle : (params) ->

    puznid = params['puzzle_id']
    projid = params['project_id']
    
    # check nid, use new browser if nid not specified
    if !(puznid?) and projid?
      Utils.redirect_to("/web/browse/"+projid+"/")
    if !(puznid?)
      return 

    # query fusion table for nid, use new browser if found
    query = "https://www.googleapis.com/fusiontables/v2/query?sql="
    query += "SELECT+*+FROM+1wOp-BRLM3jpIpj3PfsV9wKOqEvP6ZkoPu3__QA8G"
    query += "+WHERE+Puzzle_ID%20IN%20%28" + puznid + "%29"
    query += "&key=AIzaSyD6cZ6iB7D1amG_DQfRjvCCXSlEeZrPiGE"
    
    # initialize GET request for data
    xhr = new XMLHttpRequest()
    xhr.addEventListener 'readystatechange', ->
      if xhr.readyState is 4
        success_retcodes = [200, 304]
        if xhr.status in success_retcodes
          resp = JSON.parse xhr.responseText

          # check for data rows
          if !(resp?) or !(resp.rows?)
            # data for nid not found, revert to legacy browser
            console.log("[warning] no data in new browser for nid: " + puznid)
            console.log("[warning] revert to legacy browser")
            Utils.redirect_to("/game/browse/"+puznid+"/")

    # open/send GET request for data
    xhr.open "GET", query, true
    xhr.send()
    
    return 
