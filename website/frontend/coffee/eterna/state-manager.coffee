class @BuilderStateManager extends Builder


  on_build: (block, $container, params) ->


    @init_viewport()

    ThemeCompiler.compile_block(block,params,$container)
    
    # for debugging...
    if !(params['responsive']?) and !(params['resp']?)
      return true

    
    @_states = []
    @_state = {id: '', on_enter: ''}

    @log('registering states...')
    @register_states([
      {id: 'desktop', min_width: 980, on_enter: 'display_desktop'},
      {id: 'mobile', max_width: 980, on_enter: 'display_mobile'}
    ])
    @log('initializing...')
    @initialize()


  _is_mobile: () ->
    return Utils.is_mobile()   

  _browser_height: () ->
    return Utils.get_browser_height()   

  _browser_width: () ->
    return Utils.get_browser_width()   

  log: (message) ->
    console.log("BuilderStateManager: " + message)

  register_states: (states) ->
    for state in states
      @_states.push state
   
    return


  initialize: () ->

    @init_responsive_state()
    #@update_state()
    $(document).ready(() =>
      @init_responsive_state()
      @update_state()
    )
    $(window).on('resize', () =>
      @update_state()
    )
    return

  _set_current_state: (s) =>
    @_state = {}
    @_state['id'] = s.id
    if s.max_width?
      @_state['max_width'] = s.max_width
    if s.min_width?
      @_state['min_width'] = s.min_width
    @_state['on_enter'] = s.on_enter
    return true

  update_state: () =>
    w = @_browser_width()
    for state in @_states
      if @_is_mobile()
        if state.id.indexOf('mobile') < 0
          continue
      else
        if state.max_width? and not (w <= state.max_width)
          continue  
        if state.min_width? and not (w > state.min_width)
          continue

      @[state.on_enter]()

      if @_state.id.indexOf(state.id) < 0
        @log('enter '+state.id)
        @_set_current_state(state)
      else
        @log('resize '+state.id)

      break
  
    return 


  init_viewport: () ->
    # for mobile
    $('head').append('<meta name="viewport" content="width=device-width, initial-scale=0.4, maximum-scale=0.4">');
    if $top_bar = $('div[name=top-bar]')
      $top_bar.css('width','980px')
      $top_bar.css('left','calc(50% - 490px)') 
    return
    
      
  init_responsive_state: () =>

    if $pages = $('div#pages')
      $pages.css('margin-bottom', '110px')

    if $top_bar = $('div[name=top-bar]')
      $top_bar.css('position','fixed')
      $top_bar.css('z-index','9999')
      #$top_bar.css('background-color', 'rgba(87,87,87,1.0)')
      $top_bar.css('background-color', '#011e46')
      #$top_bar.css('border-bottom', '3px solid #DDD')
      $top_bar.css('box-shadow': '0px 3px 5px rgb(0, 0, 0)')
      $top_bar.css('top', '0px')
      $top_bar.css('left','0px') 
      $top_bar.css('width','100%')


    if $side_container = $('div#side-container')
      #$side_container.css({
      #  'position': 'fixed',
      #  'float': 'left',
      #  'left': 'calc(50% + 230px)'	
      #})
      $side_container.show()


  display_mobile: () =>

    ########################################
    ### top bar stuff
    ######################################## 
    # use default logos
    if $banner_eterna_mini = $('a#banner-eterna-logo-mini')  
      $banner_eterna_mini.show()

    if $banner_eterna = $('a#banner-eterna-logo')
      $banner_eterna.hide()
    if $banner_lab_link = $('a#banner-lab-link')
      $banner_lab_link.hide()
    if $banner_event_link = $('a#banner-event-link')
      $banner_event_link.hide()

    if $top_bar = $('div[name=top-bar]')
      $top_bar.css('background-repeat','repeat-x')
      $top_bar.css('background-position','-114px') 
      if $top_bar_container = $('div#top-bar-container')
        $top_bar_container.css('width', '100%')
        $top_bar_container.css('left', '0%')

    # hide user login 
    if $user_login = $('div#user-login')
      $user_login.hide()

    if $user_login_mini = $('div#user-login-mini')
      $user_login_mini.parent().css('float', 'left')
      $user_login_mini.show()

    if $navmenu_mini = $('div#navmenu-mini')
      $navmenu_mini.parent().css('float', 'right')
      $navmenu_mini.show()

      # user_login_dropdown.show()

      # show mini nav bar
      #if $navbar_mini = $('div#navmenu-mini')
      #  $navbar_mini.css({
      #    'position':'relative',
      #    'float':'right',
      #    'right': '10px'
      #  }) 
      #  $navbar_mini.show()

    # show nav icon
    

    ########################################
    ### side bar stuff
    ########################################   
    if $side_container = $('div#side-container')
      if @_state.id.indexOf('mobile') < 0
        $side_container.hide()
        $side_container.css({
          'position':'fixed',
          'margin-right': '0px',
          'top':'97px',
          'z-index':'9998'
        })    

        if $chat_container = $('div.chat-container')
          $chat_container.hide()

        if $navmenu_vert = $('div#navmenu-vert-container')
          $navmenu_vert.css({
            'background-color':'#011e46', #'rgba(87, 87, 87, 1.0)',
            'top':'10px'
            'position':'absolute',
            'right': '-235px',
            'box-shadow': '-2px 3px 5px rgb(0, 0, 0)',
            #'border-bottom':'solid 3px #DDD',
            #'border-left':'solid 3px #DDD'
          })
          if $navmenu_class = $('div#HDropdown-orange-vert')
            $navmenu_class.css({
              'top':'3px'
            })
          if $navmenu_item = $('#HDropdown-orange-vert > ul > li > a')
            $navmenu_item.css({
              'border-bottom':'solid 2px rgba(0,0,0,0.0)',
              'background-color':'rgba(255,255,255,0.0)'
            })


          #######
	  # todo: mark current nav item 
	  #######
          #if $navmenu_items = $('#HDropdown-orange-vert > ul > li > a')
          #  for $link in $navmenu_items
          #    href1 = window.location.href.split '.org', 1
          #    href2 = $link['href'].split '.org', 1
          #    console.log(href1, href2)
          #    if href1 in [href2]
          #      $link.style.color = 'rgb(23,164,194)'
          #    else
          #      $link.style.color = '#ffffff'

          #if $navmenu_items = $('#HDropdown-orange-vert > ul > li > ul > li > a')
          #  for $link in $navmenu_items
          #    if window.location.href.indexOf($link['href']) > -1
          #      $link.parent().parent().parent().subitem.style.color = 'rgb(23,164,194)'
          #      break
          #    else
          #      $link.parent().parent().parent().style.color = '#ffffff'

        if $toggle_nav = $('p.navicon')
          if !(@_toggle_nav_state?)
            @_toggle_nav_state = false
          if @_toggle_nav_state is true
            $toggle_nav.click()
          $toggle_nav.on('click', () =>
            if $side_container = $('div#side-container')
              if $side_container.is(':visible')
                $toggle_nav.removeClass('navicon-active')
                $side_container.hide()
                @_toggle_nav_state = false
              else
                $toggle_nav.addClass('navicon-active')
                $side_container.show()
                @_toggle_nav_state = true
          )

    ########################################
    ### pag container stuff
    ######################################## 
    if $page_container = $('div#page-container')
      $page_container.css({
        'width':'720px'
      })
      $page_container.css({
        'position':'absolute',
        'left':'calc(50% - ' + $page_container.width()/2.0 + 'px)'
      })

    ########################################
    ### home page stuff
    ######################################## 
    if $home_page = $('div#home-page')
      $home_page.css({
        'position':'absolute',
        'left':'calc(50% - ' + $home_page.width()/2.0 + 'px)'
      })

    if $side_quests = $('div#side-quest-roadmap')
      $side_quests.children().css({
        'left': ($side_quests.width() - 400) + 'px'
      })

    if $explore_page = $('div#labs-explore-page')
      $explore_page.css({
        'position':'absolute',
        'left':'calc(50% - ' + $explore_page.width()/2.0 + 'px)'
      })

    return true


  display_desktop: () =>
  
    ########################################
    ### top bar stuff
    ######################################## 
    # use default logos
    if $banner_eterna_mini = $('a#banner-eterna-logo-mini')  
      $banner_eterna_mini.hide()

    if $banner_eterna = $('a#banner-eterna-logo')
      $banner_eterna.hide()
    if $banner_lab_link = $('a#banner-lab-link')
      $banner_lab_link.show()
    if $banner_event_link = $('a#banner-event-link')
      $banner_event_link.show()


     if $top_bar = $('div[name=top-bar]')
      $top_bar.css('background-repeat','no-repeat')
      $top_bar.css('background-position','right -114px') 
      if $top_bar_container = $('div#top-bar-container')
        $top_bar_container.css('width', '980px')
        $top_bar_container.css('left', 'calc(50% - 490px)')


    # show default user login
    if $navmenu_mini = $('div#navmenu-mini')
      $navmenu_mini.hide()

    if $user_login_mini = $('div#user-login-mini')
      $user_login_mini.hide()

    if $user_login = $('div#user-login')
      $user_login.show()      
      $user_login.parent().css('float', 'right')

    ########################################
    ### side bar stuff
    ######################################## 
    if $side_container = $('div#side-container')
      #$side_container.css({
      #  'position': 'fixed',
      #  'float': 'left',
      #  'left': 'calc(50% + 230px)'	
      #})
      $side_container.css({
        'position':'absolute',
        'margin-right': '0px',
        'top':'0px',
        'right':'0px',
        'z-index':'0'
      })    
      $side_container.show()
      
    if $chat_container = $('div.chat-container')
      $chat_container.show()

    if $navmenu_vert = $('div#navmenu-vert-container')
      $navmenu_vert.css({
        'background-color':'rgba(87, 87, 87, 0.0)',
        'top':'0px',
        'right':'0px',
        'position':'relative',
        'box-shadow': '0px 0px 0px rgb(0, 0, 0)'
      })
      if $navmenu_class = $('div#HDropdown-orange-vert')
        $navmenu_class.css({
          'top':'0px'
        })
      if $navmenu_item = $('#HDropdown-orange-vert').find('li').find('a')
        $navmenu_item.css({
          #'border-bottom':'solid 2px rgba(255,255,255,0.0)',
          #'border-left':'solid 2px rgba(255,255,255,0.0)',
          'box-shadow': '0px 0px 0px rgb(0, 0, 0)',
          'background-color':'rgba(255,255,255,0.2)'
        })
      if $navmenu_item = $('div#HDropdown-orange-vert').find('li').find('a:hover')
        $navmenu_item.css({
          'color':'#fff'
        }) 
     
	



    ########################################
    ### pag container stuff
    ######################################## 
    if $page_container = $('div#page-container')
      $page_container.css({
        'width':'980px'
      })
      $page_container.css({
        'position':'absolute',
        'left':'calc(50% - ' + $page_container.width()/2.0 + 'px)'
      })


    ########################################
    ### home page stuff
    ######################################## 
    if $home_page = $('div#home-page')
      $home_page.css({
        'position':'relative',
        'left':'0%'
      })

    if $side_quests = $('div#side-quest-roadmap')
      $side_quests.children().css({
        'left': ($side_quests.width() - 400) + 'px'
      })

    if $explore_page = $('div#labs-explore-page')
      $explore_page.css({
        'position':'relative',
        'left':'0%'
      })


    return true




 








