class @BuilderSequences extends Builder

  on_build : (block ,$container, params) ->
    PageData.get_lab_solutions((page) =>
      ThemeCompiler.compile_block(block,params,$container)
      
      solutions = page['solutions']
      
      for s in solutions
        s['body_summary'] = EternaUtils.format_summary(s['body'], 180)
      
      if $solutions = @get_element("solutions")
        packer = Packers($solutions)
        packer.add(solutions)    
    
    )
      