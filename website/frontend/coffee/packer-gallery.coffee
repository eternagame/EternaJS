BINS = [
  [ 
    {pos : [0,0], size:[1, 0.4068]}
  ],
  [
    {pos: [0, 0], size:[0.4915, 0.4068]},
    {pos: [0.5084, 0], size: [0.4915, 0.4068]}
  ],
  [
    {pos: [0,0], size: [0.3220, 0.4068]},
    {pos: [0.3390, 0], size: [0.3220, 0.4068]},
    {pos: [0.6780, 0], size: [0.3220, 0.4068]}
  ],
  [
    {pos: [0, 0], size: [0.2373, 0.1949]},
    {pos: [0, 0.2119], size: [0.2373, 0.1949]},
    {pos: [0.2542, 0], size: [0.4915, 0.4068]},
    {pos: [0.7627, 0], size: [0.2373, 0.4068]}    
  ],
  [
    {pos: [0,0], size: [0.4915, 0.1949]},
    {pos: [0, 0.2119], size: [0.2373, 0.1949]},
    {pos: [0.2542, 0.2119], size: [0.2373, 0.1949]},
    {pos: [0.5084, 0], size: [0.2373, 0.4068]},
    {pos: [0.7627, 0], size: [0.2373, 0.4068]}
  ]
]

H_MARGIN = 0.0169

fitting_score = (w,h,box,container_width) ->
  aspect_img = Number(h)/w
  aspect_box = Number(box.size[1]) / box.size[0]
  aspect_factor = Math.max(aspect_img,aspect_box) / Math.min(aspect_img,aspect_box)
  
  w_scale = Math.max(Number(w) / (box.size[0] * container_width), 1.0)
  h_scale = Math.max(Number(h) / (box.size[1] * container_width), 1.0)
  
  scale_factor = Math.min(w_scale,h_scale)
  
  return aspect_factor * scale_factor

is_fittable = (w,h,box,container_width, index) ->
  if box.owner?
    return false
  
  sizetest_failed = false
  if box.size[1] * container_width > h || box.size[0] * container_width > w
    sizetest_failed = true
  
  aspect_img = Number(h)/w
  aspect_box = Number(box.size[1]) / box.size[0]
  aspect_factor = Math.max(aspect_img,aspect_box) / Math.min(aspect_img,aspect_box)
  
  if index < 0.5
    return !sizetest_failed
  else if index < 0.75
    return !sizetest_failed
  else
    return true

bin_height = (bin, container_width) ->
  height = 0
  for box in bin
    if box.owner?
      h = (box.pos[1] + box.size[1]) * container_width
      if h > height
        height  = h
  return height

class @PackerGallery extends Packer

  layout : () ->
    $container = @$container_
    $container.css("position","relative")

    $container.html("")
    block_params = @block_params_
    @block_params_ = new Array()
    builders = @builders_ = new Array()
    @current_height_ = 0

    @add(block_params)

  on_clean : () ->
    @current_height_ = 0

  add : (new_block_params) ->
    $container = @$container_
    $container.css("position","relative")
    
    width = null
    if @setting_?
      width = parseInt(@setting_['width'])
        
    if width?
      $container.css("width", width + "px")
    else
      $container.css("width", "100%")

    container_width = $container.width()

    bins = []
    bin_sizes = []
    size = new_block_params.length
    
    while size > 0
      if size < 6
        bins.push(Utils.clone_object(BINS[size-1]))
        bin_sizes.push(size)
        break
      
      rand_size = Math.floor(Math.random() * (BINS.length-1)) % (BINS.length-1) + 2
      bins.push(Utils.clone_object(BINS[rand_size-1]))
      bin_sizes.push(rand_size)
      size -= rand_size

    new_blocks_size = new_block_params.length
    pass_count = 0
    
    for ii in [0..new_block_params.length-1] by 1
      param = new_block_params[ii]
      w = param['width']
      h = param['height']
      
      if !w
        w = 0.5 * container_width
      if !h
        h = 0.4 * container_width
      
      best_fit_box = null
      best_fit_score = -1
      
      for bb in [0..bins.length-1] by 1
        bin = bins[bb]
        for box in bin
          if is_fittable(w,h,box,container_width, Number(ii) / (new_blocks_size-1))
            fit_score = fitting_score(w,h,box,container_width)
            if !(best_fit_box?) || best_fit_score > fit_score
              best_fit_score = fit_score
              best_fit_box = box
          
      
      if best_fit_box?
        best_fit_box.owner = ii
      else
        pass_count += 1    

    block_params = @block_params_
    builders = @builders_
    block = @block_
    
    height_walker = @current_height_
    if !height_walker
      height_walker = 0
    for bb in [0..bins.length-1] by 1
      bin = bins[bb]
      height = bin_height(bin, container_width)
      
      if height == 0
        continue
      
      for box in bin
        if box.owner?
          block_params = new_block_params[box.owner]
          builder = block.add_block($container, block_params)
          $block_container = builder.get_container()
          $block_container.css("position","absolute")
          $block_container.css("left", box.pos[0] * container_width + "px")
          $block_container.css("top", box.pos[1] * container_width + height_walker + "px")
          $block_container.css("width", box.size[0] * container_width + "px")
          $block_container.css("height", box.size[1] * container_width + "px")  
          
      height_walker += height
      height_walker += H_MARGIN * container_width
    
    @current_height_ = height_walker
    $container.css("height", height_walker + "px")
