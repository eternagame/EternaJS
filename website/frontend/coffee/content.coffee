# Subscribable, storable data type for content
# JEE HACK hard coded _id
class @Content
  constructor : (data_obj) ->
    
    if data_obj['id']?
      data_obj['id'] = @parse_id(data_obj['id'])
    
    
    if (@STORAGE?) && (data_obj['id']?)
      data_obj_id = data_obj['id']
      if prev = @STORAGE[data_obj_id]
        @cbs_ = prev.cbs_
        
        prev_data = prev.data_
        for own key,val of prev_data
          if !(data_obj[key]?)
            data_obj[key] = val
              
      @parse_data(data_obj)
      @STORAGE[@get_id()]  = @
    else
      @parse_data(data_obj)  
      
  parse_id : (id) ->
    return id
    
  parse_data : (data) ->
    @data_ = data
    
  get_id : () ->
    return @data_['id']
    
  get_property : (key) ->
    return @data_[key]
  
  set_property : (key, data) ->
    @data_[key] = data

  bind : (ev,cb) ->
    if !@cbs_
      @cbs_ = new Object()
    if !@cbs_[ev]
      @cbs_[ev] = new Array()
    @cbs_[ev].push(cb)

  unbind : (ev) ->
    if !@cbs_
      return
    if ev?
      @cbs_[ev] = null  
    else
      @cbs_ = null

  trigger : (ev) ->
    
    if !@cbs_
      return
 
    if cbs = @cbs_[ev]
      for ii in [0..cbs.length-1] by 1
        if cbs[ii]?
          cbs[ii](@) 
