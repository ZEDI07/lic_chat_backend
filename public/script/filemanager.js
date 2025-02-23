let files = [];

$("#inputfile").change(async (e) => {
  const selectedFiles = e.target.files;
  for (let i = 0; i < selectedFiles.length; i++) {
    const id = String(Math.floor(Math.random() + Date.now()));
    const file = selectedFiles[i];
    if (file.type.split("/")[0] !== "image") {
      toastNotification("warning", "Invalid File Format");
      continue;
    }
    file.id = id;
    files[i] = file;
    imagePreview(file, id, true);
  }
  if (files.length > 0) {
    $("#savefile").prop("disabled", false);
  } else {
    $("#savefile").prop("disabled", true);
  }
  changevisible();
});

function removefile(eleId) {
  const index = files.findIndex((ele) => ele.id == eleId);
  if (index !== -1) files.splice(index, 1);
  $(`#${eleId}`).remove();
  $("#inputfile").val("");
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
          <strong class='removefile' onclick="removefile('${id}')"><i class="fi fi-rs-cross-small"></i></strong>
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
    if (append == false) {
      $("#uploadimages").html(content);
    } else {
      $("#uploadimages").append(content);
    }
    changevisible();
  };
  reader.readAsDataURL(file);
};

// function to upload image with file and file-> stiker, reaction, background, image, etch and id.
const uploadFile = (file, fileType, id) =>
  new Promise((res, rej) => {
    const form = new FormData();
    form.append("file", file);
    $.ajax({
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
        res(response);
      },
      error: (error) => {
        toastNotification(
          "danger",
          JSON.parse(error?.responseText)?.message || "Error !!"
        );
        $(`#${id}`).remove();
        rej(error);
      },
    });
  });

// function to delete file from storage
function updateFileStatus(id, status, refreshFunction) {
  return new Promise((res, rej) => {
    $.ajax({
      type: "POST",
      url: "/delete-file",
      data: { id: id, status: status },
      success: (response) => {
        refreshFunction && refreshFunction();
        toastNotification("success", "File Deleted Successfully.");
        res(response);
      },
      error: (error) => {
        toastNotification("danger", error.responseJSON.message);
        rej(error);
      },
    });
  });
}

// to show select file to upload.
function changevisible() {
  const childs = $("#uploadimages").children();
  if (childs.length > 1) {
    $("#uploadimages_default").hide();
  } else {
    $("#uploadimages_default").show();
  }
}
