(function () {
  // Extract token from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const urlLinks = [
    {
      text: "Complete Payment (Credit Card - Failed)",
      endpoint: "/pay/fail?token=%%token%%",
      errorMessage: "Unable to mark payment as failed",
    },
  ];

  const getConfigForLinkText = (text) => {
    return urlLinks.find((entry) => entry.text === text);
  };

  document.querySelectorAll("a").forEach((linkElement) => {
    const config = getConfigForLinkText(linkElement.innerHTML);

    if (!config) {
      return;
    }

    linkElement.addEventListener("click", async function (event) {
      event.preventDefault();

      if (!config.endpoint) {
        window.alert(config.errorMessage);
        return;
      }

      const redirectUrl = linkElement.getAttribute("href") || "/";

      try {
        const response = await fetch(
          config.endpoint.replace("%%token%%", encodeURIComponent(token)),
          {
            method: "POST",
          }
        );

        if (!response.ok) {
          const responseMessage = await response.text();
          window.alert(responseMessage || config.errorMessage);
          return;
        }

        window.location.assign(redirectUrl);
      } catch (error) {
        window.alert(config.errorMessage);
      }
    });
  });
})();
