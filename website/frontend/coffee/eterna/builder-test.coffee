class @BuilderTest extends Builder

  on_build : (block, $container, params) ->
    ThemeCompiler.compile_block(block,params,$container)
    $getelement = @get_element("new_button")
    $getelement.click(()=>
      alert("Hello!" + params['input_string'])
      alert("!!!!!")
    )
