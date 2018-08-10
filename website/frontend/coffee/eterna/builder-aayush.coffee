class @BuilderAayush extends Builder
  on_build : (block, $container, params) ->
    # make a cookie that expires in a week (maybe change to never? You decide)
    @createCookie "NOVA", 5000, 1

  createCookie : (name, value, days) ->
    if days
      date = new Date()
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
      expires = "; expires=" + date.toGMTString()
    document.cookie = name + "=" + value + expires + "; path=/"
    return

