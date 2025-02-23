$(document).ready(() => {
  // const hash = window.location.hash;
  // if (hash) {
  //   $(hash).click();
  // }

  const hash = window.location.hash;
  if (hash) {
    $(hash).click();
  }

  const url = window.location.pathname;
  const navRoutes = $(".navroutes");
  for (let i = 0; i < navRoutes.length; i++) {
    const nav = $(navRoutes[i]).attr("href").split("#")[0];
    if (url.includes(nav) || nav.includes(url)) {
      const navName = $(navRoutes[i]).attr("name");
      if (navName) {
        const element = $(`#${navName}`);
        element.removeClass("collapsed");
        const targetElemet = element.attr("data-bs-target");
        $(targetElemet).addClass("show");
      }
      $(navRoutes[i]).addClass("active");
      return;
    }
  }
});

onhashchange = () => {
  const hash = window.location.hash;
  if (hash) $(hash).click();
  else window.location.reload();
};

const timeoutRedirect = (url) =>
  setTimeout(() => {
    window.location.href = url;
  }, 2000);

function toastNotification(type, message) {
  const addclass = "fade show";
  switch (type) {
    case "success":
      $("#success_message").html(message);
      $("#successtoast").addClass(addclass);
      hideToast("#successtoast");
      break;
    case "warning":
      $("#warning_message").html(message);
      $("#warningtoast").addClass(addclass);
      hideToast("#warningtoast");
      break;
    case "danger":
      $("#danger_message").html(message);
      $("#dangertoast").addClass(addclass);
      hideToast("#dangertoast");
      break;
  }
}

function hideToast(id) {
  const removeclass = "fade show";
  setTimeout((id) => $(id).removeClass(removeclass), 3000, id);
}

function handleUserData(data) {
  if (data.success) {
    const user = data.data;
    $("#user-image").attr("src", user.avatar);
    $("#user-name").html(user.name);
    $("#user-designation").html("Developer");
  }
}

/**
 * funtion to list page no.
 * @param {*} count
 * @param {*} pageSize
 * @param {*} selectedPage
 * @returns list of pageno .
 */
function getPaginationContent(count, pageSize, selectedPage) {
  pageLimit = Math.ceil(count / pageSize);
  let listContent = `<li class="page-item disabled" id="PreviousButtonList">
    <a class="page-link" id="previousButton" onclick="previousPage()" tabindex="-1">
      Previous
    </a>
  </li>`;
  const columnSize = 9;
  if (pageLimit > columnSize) {
    const mid = Math.ceil(columnSize / 2);
    const offset = Math.floor(mid / 2);
    const delta = pageLimit - offset - 2;
    let left = mid - offset - 1;
    let right = mid + offset + 1;
    for (let page = 1; page <= pageLimit; page++) {
      if (
        page == 1 ||
        page == selectedPage ||
        page == pageLimit ||
        (selectedPage <= mid && page <= mid + offset) ||
        (selectedPage > mid &&
          selectedPage < delta &&
          page >= selectedPage - offset &&
          page <= selectedPage + offset) ||
        (selectedPage >= delta && page >= delta - offset)
      ) {
        listContent += renderElement(page, selectedPage);
      }
      if (
        (selectedPage > mid &&
          (page == left ||
            (selectedPage < delta && page == selectedPage + offset))) ||
        (selectedPage <= mid && page == right)
      ) {
        listContent += `<li class="page-item disabled">
          <a class="page-link" >
            ...
          </a>
        </li>`;
      }
    }
  } else {
    for (let page = 1; page <= pageLimit; page++) {
      listContent += renderElement(page, selectedPage);
    }
  }
  listContent += `<li class="page-item ${
    pageLimit <= 1 ? "disabled" : ""
  }" id="NextButtonList">
    <a class="page-link" id="nextButton" onclick="nextPage()">
      Next
    </a>
  </li>`;
  return listContent;
}

function renderElement(page, selectedPage) {
  return ` <li class="page-item"> <a class="page-link ${
    selectedPage == page ? "active" : ""
  }" onClick="getPageUserList(this.id)" id="${page}"> ${page} </a> </li>`;
}

// Pagination Next Button Click Function.
async function nextPage() {
  if (page < pageLimit) {
    page++;
    if ($("#searchInput").val() || $("#inactiveSearchInput").val()) {
      await search();
    } else {
      await getDataTable(page);
    }
    page > 1 && $("#PreviousButtonList").removeClass("disabled");
    page == pageLimit && $("#NextButtonList").addClass("disabled");
  }
}

// Pagination Previous Button Click Function
async function previousPage() {
  if (page > 1) {
    page--;
    if ($("#searchInput").val() || $("#inactiveSearchInput").val()) {
      await search();
    } else {
      await getDataTable(page);
    }
    page > 1 && $("#PreviousButtonList").removeClass("disabled");
  }
}

// Pagination on Any number click function .
async function getPageUserList(pageno) {
  page = +pageno;
  if ($("#searchInput").val() || $("#inactiveSearchInput").val()) {
    await search();
  } else {
    await getDataTable(page);
  }
  if (page == 1) {
    $("#PreviousButtonList").addClass("disabled");
  } else $("#PreviousButtonList").removeClass("disabled");
  if (page == pageLimit) {
    $("#NextButtonList").addClass("disabled");
  } else $("#NextButtonList").removeClass("disabled");
}
