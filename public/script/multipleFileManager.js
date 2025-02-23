let files = [];
$("#inputfile").change(async (e) => {
  const selectedFiles = e.target.files;
  const type = $("#inputfile").attr("name");
  for (let i = 0; i < selectedFiles.length; i++) {
    const id = String(Math.floor(Math.random() + Date.now()));
    const file = selectedFiles[i];
    file.id = id;
    files[i] = file;
    imagePreview(file, id);
    uploadFile(file, type, id);
  }
  changevisible();
});

function removefile(eleId) {
  const index = files.findIndex((ele) => ele.id == eleId);
  if (index !== -1) files.splice(index, 1);
  $(`#${eleId}`).remove();
  changevisible();
}
// function to preview file require file config and id
const imagePreview = (file, id, append = true) => {
  const reader = new FileReader();
  reader.onload = function () {
    const content = `<li id=${id}>
      <div class="upload-files-progress-left">
        <img
          src=${reader.result}
          alt="img upload"
          id="previewImg"
        />
      </div>
      <div class="upload-files-progress-right">
        <p class="upload-files-progress-title">
          <span>${file.name}</span>
          <strong class='removefile' onclick="abortRequest('${id}')"><i class="fi fi-rs-cross-small"></i></strong>
        </p>
        <div class="progress">
          <div
            class="progress-bar progress-bar-striped progress-bar-animated"
            role="progressbar"
            aria-label="Default striped example"
            style="width: 0%"
            id="progressbar_${id}"
            aria-valuenow="10"
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
        </div>
        <p class="upload-files-progress-title">
          <span>${(file.size / 1024).toFixed(2)} KB</span>
          <strong id="percentagetitle_${id}">0%</strong>
        </p>
      </div>
    </li>`;
    $("#uploadimages").append(content);
    changevisible();
  };
  reader.readAsDataURL(file);
};

// function to upload image with file and file-> stiker, reaction, background, image, etch and id.
const uploadFile = (file, fileType, id) => {
  new Promise((res, rej) => {
    const form = new FormData();
    form.append("file", file);
    const ajaxRequest = $.ajax({
      xhr: function () {
        const xhr = new window.XMLHttpRequest();
        xhr.upload.addEventListener(
          "progress",
          function (evt) {
            if (evt.lengthComputable) {
              var percentComplete = ((evt.loaded / evt.total) * 100).toFixed(2);
              $(`#progressbar_${id}`).width(percentComplete + "%");
              $(`#percentagetitle_${id}`).html(percentComplete + "%");
              if (percentComplete == 100) {
                $(`#progressbar_${id}`).parent().hide();
                $(`#percentagetitle_${id}`).hide();
              }
            }
          },
          false
        );
        return xhr;
      },
      url: `/file-upload/${fileType}`,
      method: "POST",
      timeout: 0,
      processData: false,
      mimeType: "multipart/form-data",
      contentType: false,
      data: form,
      success: (response) => {
        response = JSON.parse(response);
        removefile(id);
        getDataTable();
        res(response);
      },
      error: (error) => {
        toastNotification("danger", "Error while uploding file!!");
        $(`#${id}`).remove();
        rej(error);
      },
    });
    requests[id] = ajaxRequest;
  });
};

function abortRequest(id) {
  requests[id].abort();
  removefile(id);
}

function changevisible() {
  const childs = $("#uploadimages").children();
  if (childs.length > 1) {
    $("#uploadimages_default").hide();
  } else {
    $("#uploadimages_default").show();
  }
}

function removefile(eleId) {
  const index = files.findIndex((ele) => ele.id == eleId);
  if (index !== -1) files.splice(index, 1);
  $(`#${eleId}`).remove();
  changevisible();
  // updateFileStatus(media, false, null);
}

async function saveFile() {
  $(".removefile").hide();
  const uploadPromise = [];
  for (let file of files) {
    uploadPromise.push(uploadFile(file, "file", file.id));
  }
  await Promise.all(uploadPromise);
  toastNotification("success", "File uploaded successfully");
  const content = `<li>
    <div
      class="alert alert-warning text-center"
      role="alert"
      style="margin: 15px"
    >
      Please select file to upload.
    </div>
  </li>`;
  $("#uploadimages").html(content);
  $("#inputfile").val("");
  $("#savefile").prop("disabled", true);
  getDataTable();
}
