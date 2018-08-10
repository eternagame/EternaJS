JQUERY_HANDLER_COUNTER = 0

$.fn.exists = () ->
    return @length? && @length != 0
    
$.fn.is_visible = () ->
  if el = @[0]
    return el.offsetWidth * el.offsetHeight > 0
  else
    return false

$.fn.set_builder = (builder) ->
  jQuery.data(@[0], "builder", builder)
  
$.fn.get_builder = () ->
  return jQuery.data(@[0], "builder")

$.fn.bind_window_event = (ev, cb) ->
  if !cb
    return
  
  if !(@handler_unique_id_?)
    @handler_unique_id_ = JQUERY_HANDLER_COUNTER
    JQUERY_HANDLER_COUNTER++
  
  ev = ev.toLowerCase()
  key_event = (ev == "keydown") || (ev == "keypress") || (ev == "keyup")
  ev = ev + "." + @handler_unique_id_
  
  # We have to use body for IE shit
  ie_ver = Utils.get_IE_version()
  if key_event || (ie_ver? && ie_ver <= 7)
    $("body").bind(ev,() =>
      if @is_visible()
        cb.apply(@,arguments)
    )
  else
    $(window).bind(ev,() =>
      if @is_visible()
        cb.apply(@,arguments)
    )       

$.fn.unbind_window_event = (ev, cb) ->
  
  ev = ev.toLowerCase()
  key_event = (ev == "keydown") || (ev == "keypress") || (ev == "keyup")
  ev = ev + "." + @handler_unique_id_

  # We have to use body for IE shit
  ie_ver = Utils.get_IE_version()  
  if key_event || (ie_ver? && ie_ver <= 7)
    $("body").unbind(ev)
  else
    $(window).unbind(ev)
    

