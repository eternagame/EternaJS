class @BuilderTopBar extends Builder

  on_build: (block, $container, params) ->

    ThemeCompiler.compile_block(block,params,$container)

    #@update_topbar_layout(block, $container, params)
    #$container.bind_window_event("resize", () =>
    #  @update_topbar_layout(block, $container, params)
    #)



  update_topbar_layout: (block, $container, params) ->
    breakpoint = 980
    params['style2'] = true

    w_width = $(window).width()

    #alert(w_width)
    if w_width <= breakpoint
      # skinny screen

      if $banner_eterna = $('a#banner-eterna-logo')
        if params['style2']?
          $banner_eterna.hide()
          if $img = $banner_eterna.find('img')
            $img.attr('src', '/puzzle-progression/badges/default-eterna-badge.png')
            $img.css({
              'position':'relative',
              'height':'80px',
              'width':'80px',
              'left': ((w_width/2)-40)+'px',
            })
          if $top_bar = $('div[name=top-bar]')
            $top_bar.css('background-repeat','repeat-x')  
        $banner_eterna.show()
      if $banner_lab = $('a#banner-lab-link')
        $banner_lab.hide()

      # hide user login 
      if params['use_header_right']? and parseInt(params['use_header_right']) > 0
        if $user_login = $('div#user-login')
          $user_login.hide()
	
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


    else
      # widescreen (default behavior)

      # use default logos
      if params['use_tb_logo']? and parseInt(params['use_tb_logo']) > 0
        if $banner_eterna = $('a#banner-eterna-logo')
          $banner_eterna.hide()
        if $banner_lab_link = $('a#banner-lab-link')
          $banner_lab_link.show()

        if $top_bar = $('div[name=top-bar]')
          $top_bar.css('background-repeat','no-repeat')  

      # show default user login
      if params['use_header_right']? and parseInt(params['use_header_right']) > 0
        if $user_login = $('div#user-login')
          $user_login.show()      


