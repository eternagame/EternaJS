class @BuilderPopOverlay extends Builder

  on_build : (block, $container, params) ->

    block_name = params['block-name']
    
    if !(block_name?)
      Utils.display_error("Block name missing in BuilderPopOverlay")
      return

    ThemeCompiler.compile_block(block,params,$container)

    if params['login-required'] && !(User.get_current_uid()?)
      $container.click(() =>
        PolyUtils.pop_login_overlay()  
      )
      return
    
    $container.click(() =>
      overlay_slot_id = block_name
      if postfix = params['postfix']
        overlay_slot_id += "-" + postfix

      if params['anchor-current-overlay']
        Overlay.anchor_current_panel()

      if !Overlay.is_overlay_content_there(overlay_slot_id)
        block = Blocks(block_name)
        
        if !(block?)
          Utils.display_error("Can't find a block in BuilderPopOverlay")
          return
        
        $overlay_slot = Overlay.get_slot(overlay_slot_id)
        Overlay.load_overlay_content(overlay_slot_id)
        Overlay.show()  
        block.add_block($overlay_slot, params)
      else
        Overlay.load_overlay_content(overlay_slot_id)
        Overlay.show()  
            
    )