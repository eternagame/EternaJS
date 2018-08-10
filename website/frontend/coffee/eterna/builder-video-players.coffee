class @BuilderNativePlayer extends Builder

  on_build: (block, $container, params) ->
    ThemeCompiler.compile_block(block,params,$container)

    if videos = @get_element("native-player")
      for idx in [0..videos.length-1] by 1
        player = document.createElement("div")
        player.setAttribute("id", "native-player-"+idx)
        player.setAttribute("data-modal", videos[idx].dataset.modal)
        player.setAttribute("data-src", videos[idx].dataset.src)
        player.setAttribute("data-image", videos[idx].dataset.image)
        @init_native_player(player)
        videos[idx].appendChild(player)


  init_native_player: (player) ->
    modal = player.dataset.modal     
    file = player.dataset.src
    image = player.dataset.image
    settings = {
      file: file,
      width: '100%',
      height: '100%',
      autostart: false,
      controlbar: "none",
    }
    if image?
      settings['image'] = image

    playerInstance = jwplayer(player)
    playerInstance.setup(settings)

    if modal? and (modal is true or modal == "true")
      @init_modal(playerInstance)


  init_modal: (playerInstance) ->
    playerInstance.on('buffer', (event) =>
      @resize_native_player()
      $(window).on("resize", () =>
        @resize_native_player()
      )
    )
    playerInstance.on('play', (event) =>
      @resize_native_player()
      $(window).on("resize", () =>
        @resize_native_player()
      )
    )
    if $close_button = @get_element("close-button")
      $close_button.click(() =>
        #playerInstance.pause()
        playerInstance.stop()
        @reset_native_player()
        $(window).on("resize", () =>
          @reset_native_player()
        )
      )
      
    else
      playerInstance.on('pause', (event) =>
        @reset_native_player()
        $(window).on("resize", () =>
          @reset_native_player()
        )
      )

  resize_native_player: () ->
    window_w = $(window).outerWidth()
    window_h = $(window).outerHeight()
    doc_w = $(document).width()
    doc_h = $(document).height()
    block_left = (-1.0)*(((window_w-980)*0.5)+675)
    if window_w < 980
      block_left = -675.0
    $block = $('div[name=native-player-container-block]')
    $block.css({
      width: window_w+'px',
      height: doc_h+'px',
      left: block_left+'px',
      top: '-375px',
      'background-color':'rgba(0,0,0,0.8)'
    })
    container_w = 600
    container_h = 338
    container_left = (window_w*0.5)-(container_w*0.5)
    container_top = (window_h*0.5)-(container_h*0.5)
    $container = $('div[id=native-player-container]')
    $container.css({
      position: 'relative',
      'z-index': 3,	
      width: container_w+'px',
      height:container_h+'px',
      left: container_left+'px',
      top: container_top+'px',
      opacity: 1.0
    })

    if $close_button = @get_element("close-button")
      $close_button.show()

  reset_native_player: () ->
    $block = $('div[name=native-player-container-block]')
    $block.css({
      width: '275px',
      height:'155px',
      left: '15px',
      top: '15px',
      'background-color':'rgba(0,0,0,0.0)'
    })
    $container = $('div[id=native-player-container]')
    $container.css({
      position: 'relative',
      'z-index': 3,	
      width: '100%',
      height:'100%',
      left: '0px',
      top: '0px',
      opacity: 1.0
    })
    if $close_button = @get_element("close-button")
      $close_button.hide()
  
   
   



class @BuilderYouTubePlayer extends Builder

  $_container = ''

  on_build: (block, $container, params) ->
    $_container = $container
    ThemeCompiler.compile_block(block,params,$container)
    @init_players()


  init_players: () ->
    if $ytplayers = $_container.find("#youtube-player")
      for idx in [0..$ytplayers.length-1] by 1
        player = @init_player($ytplayers[idx])
        $ytplayers[idx].appendChild(player)


  reset_players: () ->
    if ytplayers = document.getElementById("youtube-player")
      ytplayers.innerHTML = ''
    @init_players()


  init_player: (video) ->
    player = document.createElement("div")
    player.setAttribute("data-modal", video.dataset.modal)
    player.setAttribute("data-image", video.dataset.image)
    player.innerHTML = @youtube_player_thumb(video)
    player.onclick = @youtube_player_iframe
    return player


  youtube_player_thumb: (player) ->
    image = player.dataset.image
    modal = player.dataset.modal
    thumb = ''
    if image?
      thumb = '<img class="youtube-thumb" src="'+image+'">'
    else
      thumb = '<img class="youtube-thumb" src="//i.ytimg.com/vi/' + player.dataset.id + '/hqdefault.jpg"><div class="play-button"></div>'
    if modal? and (modal is true or modal == "true")
      thumb += '<div class="play-button" style="height:35px;width:45px;left:16%;top:97%;"></div>'
    else
      thumb += '<div class="play-button"></div>'    
    return thumb


  youtube_player_iframe: () ->
    if $play_button = $('.play-button')
      $play_button.hide()
    modal = this.dataset.modal    
    iframe = document.createElement("iframe")
    src = "//www.youtube.com/embed/" + this.parentNode.dataset.id
    src += "?autohide=2&border=0&wmode=opaque&enablejsapi=1&controls=1&showinfo=0&rel=0"
    src_autoplay = src + "&autoplay=1"
    iframe.setAttribute("src", src_autoplay)
    iframe.setAttribute("data-autoplay-src", src_autoplay)
    iframe.setAttribute("frameborder", "0")
    iframe.setAttribute("allowscriptaccess", "always")
    iframe.setAttribute("allowfullscreen", "true")
    iframe.setAttribute("id", "youtube-iframe")
    iframe.style.width = "100%"
    iframe.style.height = "100%"
    iframe.style.position = "relative"
    if !(this.style.zIndex?)
      this.style.zIndex = 100
    iframe.style.zIndex = this.style.zIndex + 1
    iframe.style.opacity = 1.0
    
    if modal? and (modal is true or modal == "true")
      #this.parentNode.replaceChild(iframe, this)
      this.parentNode.appendChild(iframe)
      player = this
      BuilderYouTubePlayer.prototype.init_modal(player, iframe)
    else
      this.parentNode.appendChild(iframe)

    #$(this).fadeTo(1500, 0)
    #$(iframe).fadeTo(1500, 1)


  init_modal: (player, iframe) ->

    iframe.style.pointerEvents = "none"

    # init modal on loading iframe (after poster image clicked)
    @resize_youtube_player(player, iframe)
    $(window).on("resize", () =>
      @resize_youtube_player(player, iframe)
    )
    
        
    if $close_button = $('.close-button')
      $close_button.click(() =>
    	
        @reset_youtube_player(player, iframe)
        $(window).on("resize", () =>
          @reset_youtube_player(player, iframe)
        )
        @reset_players()
	
      )
      


  resize_youtube_player: (player, iframe) ->
    if $play_button = $('.play-button')
      $play_button.hide()
    window_w = $(window).outerWidth()
    window_h = $(window).outerHeight()
    doc_w = $(document).width()
    doc_h = $(document).height()
    block_left = (-1.0)*(((window_w-980)*0.5)+675)
    if window_w < 980
      block_left = -675.0
    $block = $('div[name=youtube-container-block]')
    $block.css({
      width: window_w+'px',
      height: doc_h+'px',
      left: block_left+'px',
      top: '-375px',
      'background-color':'rgba(0,0,0,0.8)'
    })
    container_w = 720
    container_h = 405
    container_left = (window_w*0.5)-(container_w*0.5)
    container_top = (window_h*0.5)-(container_h*0.5)
    $container = $('div[id=youtube-container]')
    $container.css({
      position: 'relative',
      'z-index': 3,	
      width: container_w+'px',
      height:container_h+'px',
      left: container_left+'px',
      top: container_top+'px',
      opacity: 1.0
    })

    player.style.zIndex = iframe.style.zIndex - 1
       
    if $close_button = $('.close-button')
       $close_button.show()

    iframe.style.pointerEvents = "auto"
    


  reset_youtube_player: (player, iframe) ->
    $block = $('div[name=youtube-container-block]')
    $block.css({
      width: '275px',
      height:'155px',
      left: '15px',
      top: '15px',
      'background-color':'rgba(0,0,0,0.0)'
    })
    $container = $('div[id=youtube-container]')
    $container.css({
      position: 'relative',
      'z-index': 3,	
      width: '100%',
      height:'100%',
      left: '0px',
      top: '0px',
      opacity: 1.0
    })

    player.style.zIndex = iframe.style.zIndex + 1

    if $close_button = $('.close-button')
      $close_button.hide()

    if $container = $('div[id=youtube-container]')
       iframe.style.pointerEvents = "none"
