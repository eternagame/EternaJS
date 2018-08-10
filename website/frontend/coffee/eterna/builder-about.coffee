# AboutBuilder: 
# --------------------

# Superclass: Builder

# This class, AboutBuilder, is just a tester class to make sure I understand how to add pages using CoffeeScript.
# Like all Builder classes, it has 1 main method (on_build).
# If this class were to do something more complex, then it could have other helper methods.
# For now, it just helps out the html code by getting some quick user information (uid and username).
# Once it gets that user information, it sets the nid to some predetermined value, then gets the comments.

class @AboutBuilder extends Builder

  on_build : (block, $container, params) ->    
    user = Application.CURRENT_USER
    if user? then params['uid'] = user['uid']
    if user? then params['username'] = user["name"]
    nid = 1012169
    
    PageData.get_comments(nid, (page_data) =>
      params['nid'] = nid;
      params['comments'] = page_data['comments'];
      
      ThemeCompiler.compile_block(block, params, $container)
        
    )
     
# Method: on_build
# --------------------

# Parameters: <br />
# (1) block : The block that called this builder <br />
# (2) $container : The html container that contains the block <br />
# (3) params : An array of parameters, the params that we will actually use <br />
    
# This functions first uses ThemeCompiler to be able to access html elements.
# It lets the html access the player's id and name by setting those to the variables "uid" and "username".
# Afterwards, it uses PageData to get the comments for this about page.