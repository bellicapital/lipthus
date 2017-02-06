<?php
Page::addScript('jquery/plugins/tablesorter/jquery.tablesorter.js');
Page::addScript('jquery/plugins/tablesorter/addons/pager/jquery.tablesorter.pager.js');
Page::addScript('jquery/plugins/tablesorter/eucawidgets.js');
Page::addScript('jquery/plugins/jquery.metadata.js');
Page::addStylesheet('jquery/plugins/tablesorter/themes/'.(@$theme?:'ui').'/style.css');
Page::addStylesheet('jquery/plugins/tablesorter/addons/pager/jquery.tablesorter.pager.css');
?>