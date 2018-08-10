class @BuilderMikeBaoProfile extends Builder
  on_build : (block, $container, params) ->
    nid = 1012165
    PageData.get_comments(nid, (page_data) => 
      params['nid'] = nid
      params['comments'] = page_data['comments']
      ThemeCompiler.compile_block(block,params,$container)
      $dev = @get_element("developer")
      $dev.mouseover(() =>
        $dev.text("#1 Eterna Player...Just Kidding")
      )

      $dev.mouseout(() =>
        $dev.text("Software Developer, Eterna")
      )
    );

        
class @BuilderPartyBox extends Builder
  on_build : (block, $container, params) ->
    ThemeCompiler.compile_block(block,params,$container)
    
    $party_audio = @get_element("party-audio")
    $party_audio.bind("loadeddata", () =>
      $party_audio.get(0).play()
    ) 
