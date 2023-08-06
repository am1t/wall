var client_id = "https://am1t.github.io/scribe";
var markdownEditor = document.querySelector(".markdown");
var editor = new MediumEditor('.editable',
      { placeholder: false,
        toolbar: {
          buttons: ['bold', 'italic', 'underline', 'anchor', 'h1', 'h2', 'quote', 'orderedlist', 'unorderedlist']
        },
        extensions: {
            markdown: new MeMarkdown(function (md) {
              markdownEditor.textContent = md;
    })}
  });

function getAccessToken() {
  if (getAccessTokenFromLocalStorage()) {
    return getAccessTokenFromLocalStorage();
  }

  fetchAccessTokenByOAuth();
  return null;
}

function logOut() {
  hidePageSection("logout_btn");
  localStorage.setItem("access_token", "");
  resetEditor();
}

// Parses the url and gets the access token if it is in the urls hash
function fetchAccessTokenByOAuth() {
  var access_token = "";
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  var formBody = new URLSearchParams();
  formBody.append("code", code);
  formBody.append("client_id", client_id);
  formBody.append("grant_type", "authorization_code");

  fetch("https://mb-cors-proxy-58f00b0983b3.herokuapp.com/https://micro.blog/indieauth/token", {
    method: "POST",
    body: formBody.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      "Accept": "application/json"
    }
  })
  .then((response) => response.json())
  .then((json) => {
    console.log("Logged in as " + json.profile.name);
    access_token = json.access_token;
    localStorage.setItem("access_token", access_token);
    closeModal();
    resetEditor();
    window.location = window.location.href.split("?")[0];
  })
  .catch((err) => {
    document.getElementById('post-publish-status').innerHTML = 'Failed to fetch access token. Please try again!';
    console.error('Failed to fetch access token - ' + err);
  });

  return access_token;
}

function getAccessTokenFromLocalStorage() {
  return localStorage.getItem("access_token");
}

// If the user was just redirected from authenticating, the urls hash will
// contain the access token.
function isAuthenticated() {
  return !!getAccessTokenFromLocalStorage();
}

// Render a file to #file
function renderFile(file) {
  var fileContainer = document.getElementById("file-contents");
  fileContainer.style.display = "block";
  fileContainer.innerHTML = '';
  if(file){
    file.fileBlob.text().then(function(text){
      fileContainer.innerHTML = marked(text);
    });
  }

  fileContainer.focus();
  
  hidePageSection('authed');
  hidePageSection('pre-auth');
}

// Render a list of items to #files
function renderItems(items) {
  var filesContainer = document.getElementById("files");
  filesContainer.innerHTML = '';
  items.forEach(function(item) {
    var li = document.createElement("li");
    if (item[".tag"] === "folder") {
      li.innerHTML =
        "<a href='#folder=" +
        encodeURIComponent(item.path_display) +
        "'>" +
        item.name +
        "</a>";
    } else if (item[".tag"] === "file") {
      li.innerHTML =
        "<a href='/#file=" +
        encodeURIComponent(item.path_display) +
        "'>" +
        item.name +
        "</a>";
    }

    filesContainer.appendChild(li);
  });
}

function validatePath(path) {
  path = path.startsWith('/') ? path : '/' + path;
  path += path.endsWith('/') ? '' : '/';

  return path;
};

function getPostPath() {
  return validatePath(localStorage.getItem("wall-post-path"));
}

function getPostFileName() {
  return Date.now() + '.md';
}

function getPostMetadata() {
  var metadata = '';
  var titleMetadata = document.getElementById('post-title').value;
  var tagsMetadata = document.getElementById('post-tags').value;
  if (titleMetadata) {
    metadata = metadata + 'title : ' +  document.getElementById('post-title').value + '\n';
  }
  if (tagsMetadata) {
    metadata = metadata + 'tags : ' + document.getElementById('post-tags').value + '\n';
  }
  let today = new Date();
  metadata += 'date : ' + today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() +
      ' ' + today.getHours() + ':' + today.getMinutes() + '\n';
  return metadata;
}

function getPostBody() {
  return document.getElementById('markdown-content').value; 
}

function getContent() {
  var metadata = getPostMetadata();
  var content = getPostBody();

  return [metadata, content].filter(value => !!value).join('\n');
}

// This example keeps both the authenticate and non-authenticated setions
// in the DOM and uses this function to show/hide the correct section.
function showPageSection(elementId) {
  document.getElementById(elementId).style.display = "block";
}

function hidePageSection(elementId) {
  document.getElementById(elementId).style.display = "none";
}

function publishToMb() {
  // Create an instance of Dropbox with the access token and use it to
  // fetch and render the files in the users root directory.
  document.getElementById('post-publish-status').innerHTML = 'Publishing your post to Micro.blog';

  var title = document.getElementById('post-title').value;
  var tags = document.getElementById('post-tags').value;
  var isDraft = document.getElementById('post-draft').checked;
  var redirectUrl = "";

  hidePageSection("meta-form");
  showPageSection("authed");

  var formBody = new URLSearchParams();
  formBody.append("h", "entry");
  formBody.append("content", getPostBody());
  if(title){
    formBody.append("name", title);
  }
  if(tags){
    formBody.append("category[]",tags);
  }
  if(isDraft){
    formBody.append("post-status", "draft");
  }

  fetch("https://mb-cors-proxy-58f00b0983b3.herokuapp.com/https://micro.blog/micropub", {
    method: "POST",
    body: formBody.toString(),
    headers: {
      "Authorization": "Bearer " + getAccessTokenFromLocalStorage(),
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
    }
  })
  .then((response) => response.json())
  .then((json) => {
    console.log('Post available at ' + json.url);
    document.getElementById('post-publish-status').innerHTML = 'Published post successfully, redirecting...';
    if(isDraft){
      redirectUrl = json.preview;
    } else {
      redirectUrl = json.url;
    }
    closeModal();
    resetEditor();
    window.location = redirectUrl;
  })
  .catch((err) => {
    document.getElementById('post-publish-status').innerHTML = 'Failed to publish the post. Please try again!';
    console.error('Failed to publish the post - ' + err);
  });
}

renderFile();

/* autosave loop */
var autosaveTimeout = false;
function saveContent() {
  clearTimeout(autosaveTimeout);
  document.getElementById("post-status").innerHTML = "Saving..";
  var postContent = document.getElementById('markdown-content').value;
  document.getElementById("post-wc").innerHTML = "Word Count: " + countWords(postContent);
  document.getElementById("post-cc").innerHTML = "Character Count: " + postContent.length;

  autosaveTimeout = setTimeout(autoSave, 1000);
}

function countWords(str){
  str = str.replace(/(^\s*)|(\s*$)/gi,"") // handle start and end whitespaces
        .replace(/[ ]{2,}/gi," ") // merge multiple spaces to 1
        .replace(/\n /,"\n"); // handle newlines
  return str.split(' ').filter(function(s){return s != "";}).length;
}

function autoSave() {
  autosaveTimeout = false;
  var postData = {
    body: editor.getContent(),
    bodymd: document.getElementById('markdown-content').value
  }
  localforage.setItem('draftpost', postData).then(function(){
    document.getElementById("post-status").innerHTML = "Saved.";
  });
}

editor.on(document.getElementById('file-contents'), 'input', function(){
  saveContent();
});

// Restore draft posts from local browser storage
localforage.getItem('draftpost', function(err,val){
  if(val && val.body) {
    var fileContainer = document.getElementById("file-contents");
    fileContainer.innerHTML = val.body;
    document.getElementById('markdown-content').value = val.bodymd;
    document.getElementById("post-status").innerHTML = "Opened last saved draft..";
    fileContainer.focus();
  } 
});

if(isAuthenticated()) {
  document.getElementById("logout_btn").style.display = "inline";
} else {
  fetchAccessTokenByOAuth();
}

// Export the content in markdown and save to local
function saveLocally() {
  var textToWrite = document.getElementById('markdown-content').value; 
  // console.log(editor.getContent());
  console.log(textToWrite);
  textToWrite = textToWrite.replace(/\n/g, "\r\n");
  var textFileAsBlob = new Blob([ textToWrite ], { type: 'text/plain' });
  
  var textToSaveAsURL = window.URL.createObjectURL(textFileAsBlob);
  var fileNameToSaveAs = "scribe-post.md";

  var downloadLink = document.createElement("a");
  downloadLink.download = fileNameToSaveAs;
  downloadLink.innerHTML = "Download File";
  downloadLink.href = textToSaveAsURL;
  downloadLink.style.display = "none";
  document.body.appendChild(downloadLink);

  downloadLink.click();                
}

// Reset editor to new - remove local browser draft 
function resetEditor() {
  hidePageSection('pre-auth');
  hidePageSection('authed');
  editor.setContent('');
  localforage.setItem('draftpost', {});

  document.getElementById("file-contents").focus();
  window.location.replace("/scribe");
}

// Add overlay modal for capturing title/tags
function openModal() {
  document.getElementById('modal').classList.add('opened');
  if (isAuthenticated()) {
    showPageSection("meta-form");
    document.getElementById('post-title').focus();
  } else {
    hidePageSection("meta-form");
    showPageSection("pre-auth");
    var authUrl = "https://micro.blog/indieauth/auth?client_id=https://am1t.github.io/scribe&scope=create&state=abcd1234&response_type=code&redirect_uri=https://am1t.github.io/scribe"
    document.getElementById("authlink").href = authUrl;
  }    
}

function closeModal() {
  hidePageSection('pre-auth');
  hidePageSection('authed');
  hidePageSection('folder');
  document.getElementById('modal').classList.remove('opened');
}