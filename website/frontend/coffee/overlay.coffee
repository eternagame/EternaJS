
# Overlay curtain
@Overlay = {

  VIEW_CURTAIN_Z : 4010
  
  overlay_simple_ : false
  
  $overlay_panelholder_ : null
  $overlay_ : null
  $overlay_close_layer_ : null
  
  # Only for full Overlay
  $overlay_under_ : null

  # Only for Simple Overlay
  $content_ : null
  last_scroll_ : null

  $L_slots_ : null
  close_disabled_ : false
  showing_ : false
  return_uri_ : null

  initialize : ($body, $content) ->

    @overlay_simple_ = Utils.is_mobile()

    if !($content.exists())
      @overlay_simple_ = false

    overlay_block = BlockManager.get_block("overlay")
    builder = overlay_block.build($body, null, false)
    
    @$overlay_panelholder_ = builder.get_element('overlay-panelholder')
    @$overlay_close_layer_ = builder.get_element('overlay-close-layer')
    @$overlay_ = builder.get_element('overlay')
    
    if @overlay_simple_
      @$content_ = $content
      @$overlay_.css("position","relative")
      $overlay_under = builder.get_element("overlay-under")
      
      if $overlay_under.exists()
        $overlay_under.css("display","none")

    else  
      @$overlay_.css("overflow-y","scroll")
      @$overlay_under_ = builder.get_element('overlay-under')
    
    @$overlay_close_layer_.click(() =>
      if @close_disabled_
        return
      @clear()
      @hide()
    )

    $(document).keyup((e) =>
      if e.keyCode == KeyCode.KEYCODE_ESCAPE
        if !@showing_
          return
        if @close_disabled_
          return
        Overlay.clear()
        Overlay.hide()       
    )

    @$overlay_.css("display", "none")
    
    if !@overlay_simple_
      @$overlay_under_.css("display","none")
  
    @$L_slots_ = new Object() 

  show : () ->
    
    if @overlay_simple_
      @last_scroll_ = $(window).scrollTop()
      @$content_.css("display","none")
    else
      @$overlay_under_.css("display","block")
      $("body").css("overflow","hidden")
    
    @$overlay_.css("display", "block")
    
    @showing_ = true
    
    if @close_disabled_
      @$overlay_close_layer_.css("display","none")
    else
      @$overlay_close_layer_.css("display","block")
    
    
  set_return_uri : (uri) ->
    @return_uri_ = uri
  
  clear : () ->
    @close_disabled_ = false
    for own key,$panel of @$L_slots_
      $panel.css("display","none")
    
  hide : () ->

    if @return_uri_?
      return_uri = @return_uri_
      @return_uri_ = null
      Page.transit(return_uri,false)
      return

    if @overlay_simple_
      @$content_.css("display", "block")
    else
      @$overlay_under_.css("display","none")
      $("body").css("overflow","auto")
      
    @$overlay_.css("display", "none")
    @showing_ = false
        
    if @last_scroll_? && @overlay_simple_
      $(window).scrollTop(@last_scroll_)


  get_slot : (key) ->
    if(@$L_slots_[key])
      return @$L_slots_[key]
        
    $panel = $("<div style='display:none'>") 
    @$L_slots_[key] = $panel
    
    @$overlay_panelholder_.prepend($panel)
    return $panel

  set_loading : () ->
    @clear()  
    @$overlay_close_layer_.css("display","none")
    
    if @is_overlay_content_there("loading")
      $loading_panel = @get_slot("loading")
      $loading_panel.css("display","block")
    else
      $loading_panel = @get_slot('loading',"")
      ThemeCompiler.compile_block(BlockManager.get_block("overlay-loading"),null, $loading_panel)
      $loading_panel.css("display","block")
 
    @close_disabled_ = true
 
  set_yesno : (text,yes_cb,no_cb) ->
    @clear()
    
    $yesno_panel = @get_slot('yesno')
    
    $yesno_panel.html("")
    $yesno_panel.css("display","block")
    
    ThemeCompiler.compile_block(Blocks("overlay-yesno"), {"text": text}, $yesno_panel)
    
    $yes = $yesno_panel.find("#yes")
    $no = $yesno_panel.find("#no")
    
    if $yes.exists()
      $yes.click(yes_cb)
    if $no.exists()
      $no.click(no_cb)
    

  set_message : (text) ->
    @clear()
    
    $message_panel = @get_slot('message-box')   
    $message_panel.html("")
    $message_panel.css("display","block")
    
    ThemeCompiler.compile_block(Blocks("overlay-message"), {"text": text}, $message_panel)
    
    ## JEEFIX - MUST use get_element HERE
    $ok = $message_panel.find("#ok")    
    if $ok.exists()
      $ok.click(() =>
        Overlay.hide()
      )
  
  is_overlay_content_there : (key) ->
    return @$L_slots_[key]?
  
  return_overlay_content : (key) ->
    if @$L_slots_[key]?
      return @$L_slots_[key]
    else
      return null
    
  load_overlay_content : (key) ->   
    if !@is_overlay_content_there(key)
      Utils.dipslay_error("Trying to setup unknown overlay " + key)
      return

    @clear()    
    @$overlay_close_layer_.css("display","block")
    
    $panel = Overlay.get_slot(key)
    $panel.css("display","block")

}
