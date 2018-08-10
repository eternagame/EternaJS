class @Block

  constructor : (header_vars, @template_string_) ->
    @header_vars_ = null
    @uris_ = null
    @default_params_ = null
    @template_tokens_ = null
    @template_context_variables_ = null
    @template_compiled_cache_ = new Object()

    if header_vars? && header_vars['builder']?
      @builder_name_ = header_vars['builder']
      @builder_class_ = null

    if header_vars['name']?
      @name_ = header_vars['name']
    else
      Utils.display_error("Block name does not exist")
      return
             
    if header_vars['url']?
      @set_uri(header_vars['url'])
      u_index = 2
      while extra_url = header_vars['url' + u_index]
        @set_uri(extra_url)
        u_index++

    if header_vars['default']?
      @set_default_params(ThemeCompiler.get_attr_value(header_vars['default']))
    
    @header_vars_ = header_vars

  get_name : () ->
    return @name_

  build : ($container, block_params) ->
    
    final_block_params = null
    if Application.GLOBAL_THEME_PARAMETERS?
      final_block_params = Utils.clone_object(Application.GLOBAL_THEME_PARAMETERS)
      page_params = Page.current_parameters_
      
      for own key,value of page_params
        final_block_params[key] = value   
    else
      final_block_params = Page.get_current_page_parameters()
    
    @fill_default_parameters(final_block_params)
    
    if block_params?
      for own key, value of block_params
        final_block_params[key] = value    
    
    if !(builder?)
      if @builder_name_?
        if !(@builder_class_?)
          @builder_class_ = window[@builder_name_]
        
        if !(@builder_class_?)
          Utils.display_error("Cannot find builder " + @builder_name_)
          builder = new Builder()
        else
          builder = new @builder_class_()
      else
        builder = new Builder()
    
    builder.block_params_ = final_block_params
    builder.build(@, $container, final_block_params)
    $container.set_builder(builder)

    return builder

  add_block : ($container, block_params) ->
    
    if input_string = @header_vars_['input']
      if !block_params
        block_params = new Object()
      
      input = ThemeCompiler.get_attr_value(input_string)
      
      for own key,val of input
        if !block_params[key]
          block_params[key] = val

    tag = @header_vars_['tag']
    
    if !(tag?)
      tag = "div"
    
    $parent = $("<" + tag + ">")
    $parent.attr(@header_vars_)
    
    builder = @build($parent, block_params)
    
    #kws fixed
    if tag == "none"
      $container.append($parent.get(0).innerHTML)
    else
      $container.append($parent)
    return builder

  get_default_attrs : () ->
    return @header_vars_

  # Pageblock function - if this block is a page
  
  set_uri : (uri) ->

    if !(@uris_?)
      @uris_ = new Array()
    
    uri_obj = new Object()
    uri_obj['param_names'] = param_names = new Array()
    uri_obj['extra_param_names'] = extra_param_names = new Array()

    vars = Utils.get_url_vars(uri)
    
    for own key,value of vars
      extra_param_names.push(key)
        
    uri = String(uri.match(/^[^\?]*/))

    uri_regex_string = uri.replace(/{([^}]+)}/g, (whole, param_name) =>
      param_names.push(param_name)
      return "([^/]+)"
    )

    uri_regex_string = "^" + uri_regex_string + "$"

    uri_obj['uri'] = uri
    uri_obj['regex'] = new RegExp(uri_regex_string,"i")
    @uris_.push(uri_obj)
   
  set_default_params : (params) ->
    @default_params_ = params
    
  match_uri_and_fill_parameters : (uri, block_params) ->
    
    if !(@uris_?)
      Utils.display_error("URI regex does not exist")
      return false
    
    if !(block_params?)
      block_params = new Object()
    
    for ui in [0..@uris_.length-1] by 1
      uri_obj = @uris_[ui]
      uri_regex = uri_obj['regex']
      uri_param_names = uri_obj['param_names']
      if match = uri_regex.exec(uri)
        for ii in [0..uri_param_names.length-1] by 1
          block_params[uri_param_names[ii]] = match[ii+1]
        @fill_default_parameters(block_params)
        return true
    
    return false
  
  generate_url : (params, index) ->
    if !index
      index = 0
    if !(@uris_?)
      return null
    if !(@uris_[index]?)
      return null
    
    uri_obj = @uris_[index]
    uri = uri_obj['uri']
    uri_extra_param_names = uri_obj['extra_param_names']
    
    if @default_params_?
      final_params = Utils.clone_object(@default_params_)
    else
      final_params = new Object()
      
    page_params = Page.get_current_page_parameters()
    
    for own key,value of page_params
      final_params[key] = value
         
    if params?
      for own key,value of params
        final_params[key] = value
    
    url = ThemeCompiler.evaluate_safe(uri,final_params)
    
    params_string = ""
    params_string_needed = false
    params_to_use = new Object()
    
    for ii in [0..uri_extra_param_names.length-1] by 1
      if (val = final_params[uri_extra_param_names[ii]])?
        params_to_use[uri_extra_param_names[ii]] = val
        params_string_needed = true

    if params_string_needed
      return url + "?" + Utils.generate_parameter_string(params_to_use)

    return url

  fill_default_parameters : (params) ->
    if params? && @default_params_?
      default_params = @default_params_
      for own key, value of default_params
        if !(params[key]?)
          params[key] = value
    

class @Builder

  constructor : () ->
    @title_ = null
    @block_params_ = null
    @$container_ = null

  bind_window_callbacks : () ->
    return

  build : (block, $container, params) ->
    @$container_ = $container
    @on_build(block, $container, params)    

  on_build : (block, $container, params) ->
    ThemeCompiler.compile_block(block,params,$container)

  get_element : (token)->
    if @$container_?
      $res = @$container_.find("#" + token)
      if $res.exists()
        return $res
      else
        return null
    else
      return null
      
  get_params : () ->
    return @block_params_

  get_container : () ->
    return @$container_

