@Packers = ($container, setting, block) ->
  if !(setting?)
    if packerinput = $container.attr("packerinput")
      setting = ThemeCompiler.get_attr_value(packerinput)
  
  if !(setting?)
    setting = {}
  
  name = null
  if setting['type']?
    name = setting['type']
  else
    if (setting['min-columns']?) || (setting['max-columns']?)
      name = "cards"
  
  if setting['block-name']? && !(block?)
    block = Blocks(setting['block-name'])  
  
  if !(block?)
    Utils.display_error("Block name not specified in Packers " + setting['block-name'])
    return null
  
  if name == "cards"
    return new PackerCards(block,$container,setting)
  else if name == "float"
    return new PackerFloat(block,$container,setting)
  else
    return new Packer(block,$container,setting)


class @Packer
  
  constructor : (@block_, @$container_, @setting_) ->
    @block_params_ = new Array()
    @builders_ = new Array()
    @scroll_cb_ = null
    @scroll_buffer_ = 300
    
    if !@block_
      Utils.display_error("NULL block in Packer")
      return
    
    if !@$container_.exists()
      Utils.display_error("NULL container in Packer")
  
    if @on_initialize?
      @on_initialize()

  on_layout : () ->
    block = @block_
    block_params = @block_params_
    builders = @builders_ = new Array()
    
    for ii in [0..block_params.length-1] by 1
      builders.push(block.add_block($container, block_params[ii]))
      
  layout : () ->
    $container = @$container_
    $container.html("")
    
    @on_layout()

    if @setting_ && classes = @setting_['class']
      if builders = @builders_ 
        for ii in [0..builders.length-1] by 1
          builders.get_container().addClass(classes)
            
  on_add : (new_block_params) ->
    $container = @$container_
    
    block = @block_
    block_params = @block_params_
    builders = @builders_
    
    for ii in [0..new_block_params.length-1] by 1
      builders.push(block.add_block($container, new_block_params[ii]))
      block_params.push(new_block_params[ii])    
    
  add : (new_block_params) ->
    @on_add(new_block_params)

    if @setting_ && classes = @setting_['class']
      if builders = @builders_         
        for ii in [0..builders.length-1] by 1
          builders[ii].get_container().addClass(classes)
    
  clean : () ->
    @$container_.html("")
    @block_params_ = new Array()
    @builders_ = new Array()
    if @on_clean?
      @on_clean()
     
  get_builders : () ->
    return @builders_ 

  bind_resize : (cb) ->
  
  get_current_height : () ->
    return @$container_.offset().top + @$container_.height()
  
  set_scroll_cb : (cb, scroll_buffer) ->
    if scroll_buffer?
      @scroll_buffer_ = scroll_buffer
    
    on_scroll = () =>
      current_height = @get_current_height()
      if $(window).scrollTop() + $(window).height() > current_height - @scroll_buffer_
        @scroll_cb_()

    if !(@scroll_cb_?)
      @$container_.bind_window_event("scroll swipedown", on_scroll)

    if !(cb?)
      @$container_.unbind_window_events("scroll swipedown")
    
    @scroll_cb_ = cb

  need_to_load : () ->
    current_height = @get_current_height()
    return $(window).scrollTop() + $(window).height() > current_height - @scroll_buffer_

    
class @PackerFloat extends Packer
  
  on_layout : () ->
    block = @block_
    block_params = @block_params_
    builders = @builders_ = new Array()
    
    for ii in [0..block_params.length-1] by 1
      builder = block.add_block($container, block_params[ii])
      builders.push(builder)
      builder.get_container().css("float","left")

  on_add : (new_block_params) ->
    $container = @$container_
    
    block = @block_
    block_params = @block_params_
    builders = @builders_
    
    for ii in [0..new_block_params.length-1] by 1
      builder = block.add_block($container, new_block_params[ii])
      builders.push(builder)
      builder.get_container().css("float","left")
      block_params.push(new_block_params[ii])


class @PackerCards extends Packer

  on_initialize : () ->
    
    $container = @$container_
    $container.bind_window_event("resize", () =>
      old_num_columns = @num_columns_
      if !old_num_columns
        return
        
      width = @width_
      
      if !width
        return
      
      setting = @setting_
      if setting?
        
        if setting['width']
          content_width = parseInt(setting['width'])
              
        min_columns = 0
        if setting['min-columns']
          min_columns = parseInt(setting['min-columns'])

        container_old_width = $container.css("width")
        
        $container.css("width","100%")
        browser_width = $container.width()
        $container.css("width", container_old_width)
        
        if width > 0
          num_columns = Math.max(min_columns,parseInt(browser_width/width))
          if max_columns = setting['max-columns'] 
            num_columns = Math.min(max_columns,num_columns)
        else
          num_columns = 1      
        
        if num_columns != old_num_columns
          @layout()     
    )

  on_layout : () ->
    $container = @$container_
    block = @block_
    block_params = @block_params_
    builders = @builders_ = new Array()

    @add_columns()

    num_columns = @num_columns_
    $L_columns = @$L_columns_
    
    for cc in [0..num_columns-1] by 1
      ii = cc
      while ii < block_params.length
        builders.push(block.add_block($L_columns[cc], block_params[ii]))
        ii += num_columns

    width = @width_
    actual_num_columns = Math.min(block_params.length, num_columns)
    
    if width?
      $container.css("width", width * actual_num_columns + "px")
    else
      $container.css("width", "100%")
        
    $container.append("<div style='clear:both'></div>")

  on_add : (new_block_params) ->
    $container = @$container_
    
    block = @block_
    block_params = @block_params_
    builders = @builders_

    num_columns = @num_columns_
    $L_columns = @$L_columns_    
    width = @width_

    if !num_columns
      @add_columns()
      num_columns = @num_columns_
      $L_columns = @$L_columns_    
      width = @width_
         
    column_start = block_params.length % num_columns
    
    actual_num_columns = Math.min(new_block_params.length + block_params.length, num_columns)
    
    if width?
      $container.css("width", width * actual_num_columns + "px")
    else
      $container.css("width", "100%")

    for cc in [column_start..(column_start + num_columns-1)]
      c_index = cc % num_columns
      $column = $L_columns[c_index]
      
      ii = cc-column_start
      
      while ii < new_block_params.length     
        builders.push(block.add_block($column, new_block_params[ii]))
        block_params.push(new_block_params[ii])
        ii += num_columns

  add_columns : () ->
    
    $container = @$container_
    content_width = 300
    min_columns = 1
    num_columns = 1
    
    setting = @setting_
    if setting?
      
      if setting['width']
        content_width = parseInt(setting['width'])
            
      min_columns = 0
      if setting['min-columns']
        min_columns = parseInt(setting['min-columns'])
      
      @width_ = width = content_width
    
      $container.css("width","100%")
      browser_width = $container.width()
    
      if width
        num_columns = Math.max(min_columns,parseInt(browser_width/width))
        if max_columns = setting['max-columns'] 
          num_columns = Math.min(max_columns,num_columns)
      else
        num_columns = 1
          
    $L_columns = new Array()
    
    for ii in [0..num_columns-1] by 1
      $column = $("<div style='float:left; width:" + content_width + "px'></div>")
      $column.addClass('packer-card-column')
      $column.addClass('packer-card-column-' + ii)
      $container.append($column)
      $L_columns.push($column)
    
    $container.append("<div style='clear:both'></div>")
    
    if num_columns == 1
      $L_columns[0].css("float", "none")
    
      
    @$L_columns_ = $L_columns
    @num_columns_ = num_columns
    
  get_current_height : () ->
    min_column_height = Number.MAX_VALUE
    if !@$L_columns_
      return 0
    
    for cc in [0..@$L_columns_.length-1] by 1
      $column = @$L_columns_[cc]
      min_column_height = Math.min(min_column_height, $column.height() + $column.offset().top)
    return min_column_height
