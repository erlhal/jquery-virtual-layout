# jQuery Virtual Layout

The goal is to be able to have infinite momentum scrolling on an iPhone, kiosk, or the web, and to have it scroll without any jolting.

I took most of this code from SlickGrid, which allows you to have tables with millions of rows and no noticeable performance impact.  But I just wanted it for lists like the email list on your iPhone.

The API is not perfect yet, but it is able to work with the jQuery Mobile "scrollview" plugin, which handles momentum scrolling:

``` javascript
window.list = $("#my-content-viewport").virtualLayout({
  data: arrayOfData,
  itemRenderer: function(data, index) {
    return $("#my-template").tmpl(data);
  },
  includesViewport: true,
  rowHeight: 178,
  minBuffer: 5
});
window.list.resizeCanvas();
// hack into scrollview.js (in jquery mobile) this:
// window.list.setElementTransform(x, y) in that method... to be made easier.
$("#my-content-viewport").scrollview({
  direction: "y",
  showScrollBars: false,
  fps: 60,
  overshootDuration: 200,
  delayedClickEnabled: false,
  moveIntervalThreshold: 600,
  scrollDuration: 950
});
$("#my-content-viewport").scrollview("scrollTo", 0, 0);
```
