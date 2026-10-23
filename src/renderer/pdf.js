// Fills pdf.html with the document (called by the main process before printing).
window.renderDoc = function (md, title, accent, date) {
  document.documentElement.style.setProperty('--accent', accent);
  // the first "# Title" becomes the cover title
  const body = md.replace(/^\s*#\s+.+\n?/, '');
  document.getElementById('title').textContent = title;
  document.getElementById('meta').textContent = date;
  document.getElementById('date2').textContent = date;
  document.getElementById('doc').innerHTML = window.renderMarkdown(body);
  return document.fonts.ready.then(() => true);
};
