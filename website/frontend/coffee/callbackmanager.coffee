@CallbackManager = {
  
  cbs_ : new Array()
    
  register_callback : (cb) ->
    @cbs_.push(cb)
    return @cbs_.length-1
  
  get_callback : (index) ->
    return @cbs_[index]
}
