class @BuilderSideBar extends Builder

  on_build: (block, $container, params) ->

    ThemeCompiler.compile_block(block,params,$container)

    #@update_sidebar_layout(block, $container, params)
    #$(window).on("resize", () =>
    #  @update_sidebar_layout(block, $container, params)
    #)


  update_sidebar_layout: (block, $container, params) ->
    breakpoint = 980
    w_width = $(window).width()

    if w_width <= breakpoint
      # skinny screen

      if $side_container = @get_element('side-container')
        $side_container.hide()
        $side_container.parent().parent().children().css({
          'width': '980px'
        })

      if $side_container = $('div#side-container')
        $side_container.hide()
        $side_container.parent().parent().children().css({'width': '980px' })

    else
      # widescreen 

      if $side_container = $('div#side-container')
        $side_container.show()
