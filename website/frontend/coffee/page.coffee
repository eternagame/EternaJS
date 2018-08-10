
@Page = {

  _pages_ : null

  current_uri_ : null
  current_parameters_ : null
  
  active_builders_ : new Object()
  active_parameters_ : new Object()
  active_pages_ : new Object()
  active_page_scrolls_: new Object()
  active_is_overlay_ : new Object()
  
  initialized_ : false

  initialize : () ->
  
    @initialized_ = true

    # If there is a header, add it
    if head_block = Blocks("head")
      $head = $("head")
      head_block.build($head)


    $body = $("body")
    
    body_block = Blocks("body")
    if !(body_block?)
      Utils.display_error("Cannot find block 'body'")
      return
    body_builder = body_block.build($body,{"is_logged_in" : UserManager.get_current_uid()?})
    $content = body_builder.get_element("content")
    
    if !$content.exists()
      Utils.display_error("Cannot find content div in 'body'")
      return
    
    page_template_block = Blocks("page")
    
    if !(page_template_block?)
      Utils.display_error("Cannot find block 'page")
      return
      
    page_template_builder = page_template_block.build($content,{"is_logged_in" : UserManager.get_current_uid()?})    
   
    @$pages_ = page_template_builder.get_element("pages")
   
    if !@$pages_
      Utils.display_error("Cannot find pages in body block")
      return
        	    
    Overlay.initialize($body, body_builder.get_element("page"))

    if Utils.can_push_state()
      $(window).bind('popstate', (e) =>
        back_uri = Utils.to_uri(String(window.location))
        if back_uri == @current_uri_
          return
        @transit(back_uri, @active_is_overlay_[back_uri], true)
      )

  match_pageblock : (page_uri, page_params) ->
    uri_without_params = page_uri.match(/\/[^?]*/)
    uri_without_params = uri_without_params.toString()
    return pageblock = BlockManager.get_pageblock(uri_without_params,page_params)
        
      
  create : (pageblock, page_uri, page_params, on_overlay) ->
    page_params['is_on_overlay'] = on_overlay
    page_params['is_logged_in'] = UserManager.get_current_uid()?
    
    if @active_pages_[page_uri] && (!@active_is_overlay_[page_uri] == !on_overlay)
      builder = @active_builders_[page_uri]
      builder.bind_window_callbacks()
      return builder
          
    $pageslot = null
    if on_overlay
      $pageslot = Overlay.get_slot(page_uri)
    else
      $pageslot = $("<div style='display:none'>")
  
    @active_builders_[page_uri] = builder = pageblock.add_block($pageslot, page_params)      
    
    if !on_overlay
      @$pages_.append($pageslot)
    
    builder.bind_window_callbacks()
    @active_parameters_[page_uri] = page_params
    @active_pages_[page_uri] = $pageslot
    @active_is_overlay_[page_uri] = on_overlay
    
    return builder
    
  transit : (page_uri, on_overlay, dont_push_history) ->

    #if url, just relocate
    
    #else if uri..
    was_on_overlay = @active_is_overlay_[@current_uri_]
    
    # Save current scroll if current page is not on overlay
    if @current_uri_? && !was_on_overlay
      @save_current_page_scroll()
    
    # Unbind all global events
    Page.unbind_window()
    if global_params = Application.GLOBAL_THEME_PARAMETERS
      page_params = Utils.clone_object(global_params)
    else
      page_params = new Object()
      
    uri_params = Utils.get_url_vars(page_uri)
    
    for own key,val of uri_params
      page_params[key] = val
    
    pageblock = @match_pageblock(page_uri, page_params)
    
    if !(pageblock?)
      # Redirect to root
      Utils.display_error("Could not get pageblock for " + page_uri)
      uri_without_params = page_uri.match(/\/[^?]*/)
      uri_without_params = uri_without_params.toString()
      if uri_without_params != "/"
        Utils.redirect_to("/")
      return
    
    @current_parameters_ = page_params
    
    if !@initialized_
      @initialize()
    
    builder = @create(pageblock, page_uri, page_params, on_overlay)
    
    if !(builder?)
      Utils.display_error("Cound not get builder for " + page_uri)
      return
    
    if @current_uri_? && !dont_push_history
      if Utils.can_push_state()
        history.pushState(@current_uri_,'',page_uri)
           
    if on_overlay
      Overlay.set_loading()
      Overlay.show()
      
      if !@active_is_overlay_[@current_uri_]
        Overlay.set_return_uri(@current_uri_)

      $page = @active_pages_[@current_uri_]
      
      ## JEEFIX - HOW DO WE FIX THIS??????
      Overlay.load_overlay_content(page_uri)
      #builder.get_container().bind_post_generation_callback(() =>
        #Overlay.load_overlay_content(page_uri)
      #)
    else
      Overlay.set_return_uri(null)
      Overlay.hide()
      
      for own uri,$page of @active_pages_
        if uri == page_uri
          $page.css("display","block")
        else
          $page.css("display","none")

    @current_uri_ = page_uri
    
    # No need to restore scroll if the new page is on overlay or we are returning back from overlay page
    if !on_overlay && !was_on_overlay 
      @load_current_page_scroll()

    title =  null
    if Application.BASE_TITLE?
      title = Application.BASE_TITLE
     
    if title
      Utils.set_title(title)


  get_current_page_parameters : () ->
    return Utils.clone_object(@current_parameters_)

  get_login_destination : () ->
    return String(window.location)

  save_current_page_scroll : () ->
    if !(@current_uri_?)
      return
    
    @active_page_scrolls_[@current_uri_] = $(window).scrollTop()

  load_current_page_scroll : () ->
    if !(@current_uri_?)
      return
    
    if scroll = @active_page_scrolls_[@current_uri_]
      if scroll?
        $(window).scrollTop(scroll)

  bind_window : (ev, cb, key_event) ->
  
    ev = ev.replace(/([^\s]+)/g, (whole, evmatch) =>
      return evmatch + ".custom_event"
    )  

    # We have to use body for IE shit
    ie_ver = Utils.get_IE_version()
    if key_event || (ie_ver? && ie_ver <= 7)
      $("body").bind(ev,cb)
    else
      $(window).bind(ev,cb)      
  
  unbind_window : () ->
    $(window).unbind('.custom_event')
    $("body").unbind('.custom_event')    


  redirect_to_root : () ->
    if Application.ROOT_URL?
      Utils.redirect_to(Application.ROOT_URL)

    Utils.redirect_to("/")
    
  is_there_new_notification : () ->
    if user = Application.CURRENT_USER
      if user['Last read notification number'] == "NEW" 
        return true
    return false

  count_new_notifications : () ->
    if user = Application.CURRENT_USER
      if user['noti_count'] 
        return parseInt(user['noti_count'])
    return 0
} 