<?xml version="1.0" encoding="ISO-8859-1"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:variable name="url" select="'red'" />

  <xsl:template match="/">
    <html>
      <head>
        <title><xsl:value-of select="/rss/channel/title" /></title>
        <link rel="stylesheet" type="text/css" href="http://rss.feedsportal.com/xsl/eng/rss.css" />
        
        <script type="text/javascript" src="http://rss.feedsportal.com/xsl/js/disableOutputEscaping.js" />


      </head>
      
      <body onload="go_decoding()">
        <div id="cometestme" style="display:none;">
          <xsl:text disable-output-escaping="yes">&amp;amp;</xsl:text>
        </div>
        
        <div id="outer">
        
<div id="information">

	<div id="header">
		<div class="logo">
		</div><!-- end logo -->

		<div class="accred">
			<strong>RSS Page by </strong><a href="http://www.mediafed.com">
	  		<img src="http://rss.feedsportal.com/content/images/mediafed-logo.gif" align="bottom" alt="Mediafed logo" width="80" height="15" border="0" /></a>
		</div><!-- end accred -->
	</div><!-- end header -->

	<div class="intro">
		<h2>¿Qué es RSS?</h2>
		<p>RSS feeds permitirá a usted suscribirse a nuestro canal de noticias para que usted se mantenga al día con los nuevos artículos, sin tener que comprobar continuamente nuestro sitio web.

		Una vez que se suscriba con el lector de RSS de su elección, los nuevos artículos aparecerán automáticamente lo que le permite hacer clic en aquellos que le interesen a la continuación de la historia
</p>

		<h2>¿Cómo me suscribo?
</h2>
		<p>Haga clic en uno de los siguientes botones lector de noticias para suscribirse automáticamente o copiar y pegar la URL del feed (en la barra de dirección más arriba) en su lector favorito
</p>
	</div><!-- end intro -->


	<table class="newsreaders">
	 <tr>
	  
	  <td>
	   <a href="javascript:location.href='http://www.bloglines.com/sub/' + location.href">
	   <img src="http://www.bloglines.com/images/sub_modern1.gif" alt="Bloglines" width="80" height="15" border="0" /></a>
	  </td>
	  <td>
	   <a href="javascript:location.href='http://www.google.com/reader/view/feed/' + location.href">
	   <img src="http://buttons.googlesyndication.com/fusion/add.gif" width="104" height="17" border="0" align="bottom" alt="Add to Google"/>
	   </a>
	  </td>
	 </tr>
	</table><!-- end newsreaders -->


</div><!-- end information -->

	<div class="heading">
		<h1 class="feednametitle" id="feednametitle"><xsl:value-of select="/rss/channel/title" /></h1>
		<h4 class="feednameinfo"><xsl:value-of select="/rss/channel/description" /><xsl:text></xsl:text></h4>
		<p class="builddate"><xsl:value-of select="/rss/channel/lastBuildDate" /></p>
	</div><!-- end heading-->
        
    <div id="items">

            <xsl:for-each select="/rss/channel/item">
              <div class="item">
               <h3 class="header"><a href="{link}"><xsl:value-of select="title" /></a></h3>
               <p class="pubdate"><xsl:value-of select="pubDate" /></p>
               <p name="decodeable" class="itembody"><xsl:value-of select="description" disable-output-escaping="yes" /></p>
			  </div><!-- end item (class) -->            
            </xsl:for-each>

    </div><!-- end items (ID) -->

</div>

    </body>
    </html>
  </xsl:template>

<xsl:output method="html"
            encoding="UTF-8"
            indent="no"/>


  
</xsl:stylesheet>