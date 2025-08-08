const page = location.pathname.split('/').pop();
switch (page) {
  case '':
  case 'index.html':
    import('./index.js');
    break;
  case 'page1.html':
    import('./page1.js');
    break;
  case 'page2.html':
    import('./page2.js');
    break;
  case 'page3.html':
    import('./page3.js');
    break;
  case 'page4.html':
    import('./page4.js');
    break;
  case 'page5.html':
    import('./page5.js');
    break;
}
