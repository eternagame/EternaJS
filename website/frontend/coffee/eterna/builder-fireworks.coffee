class @BuilderFireworks extends Builder
 
  on_build: (block, $container, params) ->
    ThemeCompiler.compile_block(block,params,$container)
    #if sky = @get_element("fireworks-sky") 
    #  canvas = fireworksStart(8)
    #  #setTimeout(fireworksDestroy, 8000)


