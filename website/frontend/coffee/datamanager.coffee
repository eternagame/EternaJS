@DataManager = {
  
  data_stash_ : null

  stash_data : (data) ->
    if typeof data != "string"
      # Don't know why..but Object -> String -> JSON object makes property access MUCH faster in FF
      data = JSON.parse(JSON.stringify(data).replace(/&quot;/gi,"\\\""))
    @data_stash_ = data;
  
  store : (key,value) ->
    @data_stash_[key] = value
  
  get_from_stash : (key) ->
    if this.data_stash_ == null
      return null
    
    return @data_stash_[key]
}
