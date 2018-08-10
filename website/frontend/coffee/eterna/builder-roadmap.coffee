class @BuilderRoadmap extends Builder
  
  on_build : (block ,$container, params) ->
    user = Application.CURRENT_USER
    
    PageData.get_achievement_roadmap((page) =>

      achievements = page['achievement_roadmap']
      roadmap = new Roadmap()

      if (params? and params['ach_type']?)
        roadmap.set_nodes(achievements, true, params['ach_type'])   
      else
        roadmap.set_nodes(achievements)
      
      ThemeCompiler.compile_block(block,params,$container)
  
      if $roadmap = @get_element("roadmap")
        rendered = []
        
        roadmap_nodes = roadmap.get_nodes()
  
        height_walker = 0
        iter = 0
        
        active_block = Blocks("roadmap-box-active")
        inactive_block = Blocks("roadmap-box-inactive")
        cleared_block = Blocks("roadmap-box-cleared")      
        
        canvas_width = 900
        margin_w = 60
        margin_h = 100
        path_r = 4
        
        
        while rendered.length < roadmap_nodes.length
        
          iter++
          if iter > 1000
            Utils.display_error("Something is wrong with rendering loop " + JSON.stringify(rendered))
            break
        
          to_render = []
          total_width = 0
          
          for ii in [0..roadmap_nodes.length-1] by 1
    
            node = roadmap_nodes[ii]
            if (rendered.indexOf(node.node_key) >= 0)
              continue
            
            if !(node.prereq?) || (rendered.indexOf(node.prereq) >= 0)
              total_width += node.width
              to_render.push(node)
          
          if to_render.length > 0
            
            width_walker =  (canvas_width - (total_width + (to_render.length-1) * margin_w))/2.0
            height_max = 0
            for ii in [0..to_render.length-1] by 1              
              
              node = to_render[ii]
              block = active_block

              if node.state == "inactive"
                block = inactive_block
              else if node.state == "cleared"
                block = cleared_block
                            
              node.x = width_walker
              node.y = height_walker

              builder = block.add_block($roadmap, node)
              $node = builder.get_container()
    
              $node.css("position","absolute")
              $node.css("z-index",1)
              $node.css("top", height_walker + "px")
              $node.css("left", width_walker + "px")
              $node.css("width", node.width + "px")
              $node.css("height", node.height + "px")
    
              rendered.push(node.node_key)
              width_walker += node.width + margin_w
              height_max = Math.max(height_max, node.height)
            
            height_walker += height_max + margin_h
  
        for ii in [0..roadmap_nodes.length-1] by 1
          node = roadmap_nodes[ii]
          if (node.prereq?)
            parent = null
            for jj in [0..roadmap_nodes.length-1] by 1
              if roadmap_nodes[jj].node_key == node.prereq
                parent = roadmap_nodes[jj]
                break
            
            if !(parent?)
              continue
            
            start_count = 0
            if parent.start_count
              start_count = parent.start_count
              parent.start_count++
            else
              parent.start_count = 1
            
            x_rand = 0
            if start_count > 0
              if start_count % 2 == 0
                x_rand = -path_r * (3  + Math.floor(start_count/2))
              else
                x_rand = path_r * (3  + Math.floor(start_count/2))  
              
            end_x = node.x + node.width/2 + x_rand
            end_y = node.y
            start_x = parent.x + parent.width/2 + x_rand
            start_y = parent.y + parent.height
            mid_y = (start_y + end_y) / 2 #+ (start_count) * path_r * 3
            
            path_class = "roadmap-active-path"
              
            if node.state == "inactive"
              path_class = "roadmap-inactive-path"
  
            x_diff = Math.abs(end_x-start_x)
            if x_diff > 1
            
              $path = $("<div style='position:absolute;'>")
              $path.addClass(path_class)
              $path.css("z-index", 0)
              $path.css("left", start_x - path_r)
              $path.css("top", start_y + path_r)
              $path.css("width", path_r * 2)
              $path.css("height", mid_y - start_y)
              $roadmap.append($path)
              
              $path = $("<div style='position:absolute;'>")
              $path.addClass(path_class)
              $path.css("left", Math.min(end_x,start_x) + path_r)
              $path.css("top", mid_y - path_r)
              $path.css("width", x_diff - path_r * 2)
              $path.css("height", path_r * 2)
              $roadmap.append($path)          
            
              $path = $("<div style='position:absolute;'>")
              $path.addClass(path_class)
              $path.css("left", end_x - path_r)
              $path.css("top", mid_y - path_r)
              $path.css("width", path_r * 2)
              $path.css("height", end_y - mid_y)
              $roadmap.append($path)          
            else
              $path = $("<div style='position:absolute;'>")
              $path.addClass(path_class)
              $path.css("z-index", 0)
              $path.css("left", start_x - path_r)
              $path.css("top", start_y + path_r)
              $path.css("width", path_r * 2)
              $path.css("height", end_y - start_y - path_r * 2)
              $roadmap.append($path)
                            
        $roadmap.css("height",height_walker)

    )
    
    
class @BuilderOverlayAchievements extends Builder
  
  on_build : (block ,$container, params) ->
    ThemeCompiler.compile_block(block,params,$container)
    
    if achievements = params["achievements"]
      $achievements = @get_element("achievements")
      
      packer = Packers($achievements)
      achievements_params = []
   
      for own key, ach of achievements
        achievements_params.push({img:ach['image'], name:ach['title'], desc:ach['desc'], past:ach['past']})
      packer.add(achievements_params)
