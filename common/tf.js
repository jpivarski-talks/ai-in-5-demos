// TensorFlow.js for a demo page. Inside the talk, borrow index.html's copy (common/tf-host.js),
// whose GPU programs are already compiled; on its own, a page loads its own copy.
(function () {
  "use strict";
  let host = null;
  try { host = window.parent !== window && window.parent.TFHost; } catch (e) {}
  if (host) window.tf = host.attach(window);
  else document.write('<script src="' + document.currentScript.src.replace(/common\/tf\.js(\?.*)?$/, "lib/tf.min.js") + '"><\/script>');
})();
