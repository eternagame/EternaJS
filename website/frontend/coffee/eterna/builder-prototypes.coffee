class @BuilderPrototypes extends Builder
  
  on_build : (block, $container, params) ->
      ThemeCompiler.compile_block(block,params,$container)

class @BuilderPrototypes2 extends Builder
  
  on_build : (block, $container, params) ->
      ThemeCompiler.compile_block(block,params,$container)
      	

      $container.find(".programmers").click(()=>
      )   