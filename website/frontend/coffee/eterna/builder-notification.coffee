class @BuilderNotification extends Builder

  on_build: (block, $container, params) ->

    if Application.CURRENT_USER
      params['uid'] = Application.CURRENT_USER['uid']
      
    ThemeCompiler.compile_block(block,params,$container)
    
    if Application.CURRENT_USER?
      @display_notifications()


  display_notifications: () ->

    PageData.get_noti_count_for_user((data) =>

      noti_count = data['noti_count']

      if noti_count? and noti_count > 0

        # update navigation menu notifications
        if $newsfeed = $('a#menu-item-newsfeed')
          $newsfeed.addClass('notification')
          $newsfeed.attr('data-noti', noti_count)

        # update browser tab notifications
        document.title = 'Eterna (' + noti_count + ') - Invent Medicine'				  

      setTimeout(BuilderNotification.prototype.display_notifications, 1000 * 15)

    )

