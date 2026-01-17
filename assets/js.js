// ================================
// 1. Speculation Rules (JSON config injected dynamically)
// ================================
const speculationRules = {
  prefetch: [
    {
      source: "document",
      where: {
        and: [
          { href_matches: "/*" },
          {
            not: {
              href_matches: [
                "/wp-*.php",
                "/wp-admin/*",
                "/wp-content/uploads/*",
                "/wp-content/*",
                "/wp-content/plugins/*",
                "/wp-content/themes/wt_theme/*",
                "/*\\?(.+)"
              ]
            }
          },
          { not: { selector_matches: 'a[rel~="nofollow"]' } },
          { not: { selector_matches: ".no-prefetch, .no-prefetch a" } }
        ]
      },
      eagerness: "conservative"
    }
  ]
};

// Dynamically inject speculationrules
const specScript = document.createElement("script");
specScript.type = "speculationrules";
specScript.textContent = JSON.stringify(speculationRules, null, 2);
document.head.appendChild(specScript);

// ================================
// 2. Rocket Browser Compatibility Checker
// ================================
"use strict";
var _createClass = (function() {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      "value" in descriptor && (descriptor.writable = true);
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  return function(Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
})();

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

var RocketBrowserCompatibilityChecker = (function() {
  function RocketBrowserCompatibilityChecker(options) {
    _classCallCheck(this, RocketBrowserCompatibilityChecker);
    this.passiveSupported = false;
    this._checkPassiveOption(this);
    this.options = !!this.passiveSupported && options;
  }

  return _createClass(RocketBrowserCompatibilityChecker, [
    {
      key: "_checkPassiveOption",
      value: function(self) {
        try {
          var options = {
            get passive() {
              return !(self.passiveSupported = true);
            }
          };
          window.addEventListener("test", null, options);
          window.removeEventListener("test", null, options);
        } catch (err) {
          self.passiveSupported = false;
        }
      }
    },
    {
      key: "initRequestIdleCallback",
      value: function() {
        if (!("requestIdleCallback" in window)) {
          window.requestIdleCallback = function(cb) {
            var start = Date.now();
            return setTimeout(function() {
              cb({
                didTimeout: false,
                timeRemaining: function() {
                  return Math.max(0, 50 - (Date.now() - start));
                }
              });
            }, 1);
          };
        }
        if (!("cancelIdleCallback" in window)) {
          window.cancelIdleCallback = function(id) {
            return clearTimeout(id);
          };
        }
      }
    },
    {
      key: "isDataSaverModeOn",
      value: function() {
        return "connection" in navigator && navigator.connection.saveData === true;
      }
    },
    {
      key: "supportsLinkPrefetch",
      value: function() {
        var elem = document.createElement("link");
        return (
          elem.relList &&
          elem.relList.supports &&
          elem.relList.supports("prefetch") &&
          window.IntersectionObserver &&
          "isIntersecting" in IntersectionObserverEntry.prototype
        );
      }
    },
    {
      key: "isSlowConnection",
      value: function() {
        return (
          "connection" in navigator &&
          "effectiveType" in navigator.connection &&
          (navigator.connection.effectiveType === "2g" ||
            navigator.connection.effectiveType === "slow-2g")
        );
      }
    }
  ]);
})();

// ================================
// 3. Rocket Preload Links Config
// ================================
var RocketPreloadLinksConfig = {
  excludeUris:
    "/(?:.+/)?feed(?:/(?:.+/?)?)?$|/(?:.+/)?embed/|/(index.php/)?(.*)wp-json(/.*|$)|/refer/|/go/|/recommend/|/recommends/",
  usesTrailingSlash: "1",
  imageExt: "jpg|jpeg|gif|png|tiff|bmp|webp|avif|pdf|doc|docx|xls|xlsx|php",
  fileExt:
    "jpg|jpeg|gif|png|tiff|bmp|webp|avif|pdf|doc|docx|xls|xlsx|php|html|htm",
  siteUrl: "https://www.jitnpr.com",
  onHoverDelay: "100",
  rateThrottle: "3"
};

// ================================
// 4. Rocket Preload Links Logic
// ================================
(function() {
  "use strict";
  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var RocketPreload = (function() {
    function RocketPreload(browser, config) {
      _classCallCheck(this, RocketPreload);
      this.browser = browser;
      this.config = config;
      this.options = this.browser.options;
      this.prefetched = new Set();
      this.eventTime = null;
      this.threshold = 1111;
      this.numOnHover = 0;
    }

    RocketPreload.prototype.init = function() {
      if (
        !this.browser.supportsLinkPrefetch() ||
        this.browser.isDataSaverModeOn() ||
        this.browser.isSlowConnection()
      )
        return;
      this.regex = {
        excludeUris: new RegExp(this.config.excludeUris, "i"),
        images: new RegExp(".(" + this.config.imageExt + ")$", "i"),
        fileExt: new RegExp(".(" + this.config.fileExt + ")$", "i")
      };
      this._initListeners(this);
    };

    RocketPreload.prototype._initListeners = function(e) {
      if (this.config.onHoverDelay > -1)
        document.addEventListener("mouseover", e.listener.bind(e), e.listenerOptions);
      document.addEventListener("mousedown", e.listener.bind(e), e.listenerOptions);
      document.addEventListener("touchstart", e.listener.bind(e), e.listenerOptions);
    };

    RocketPreload.prototype.listener = function(e) {
      var t = e.target.closest("a"),
        n = this._prepareUrl(t);
      if (n === null) return;
      switch (e.type) {
        case "mousedown":
        case "touchstart":
          this._addPrefetchLink(n);
          break;
        case "mouseover":
          this._earlyPrefetch(t, n, "mouseout");
      }
    };

    RocketPreload.prototype._earlyPrefetch = function(t, e, n) {
      var i = this,
        r = setTimeout(function() {
          r = null;
          if (i.numOnHover === 0)
            setTimeout(function() {
              i.numOnHover = 0;
            }, 1000);
          else if (i.numOnHover > i.config.rateThrottle) return;
          i.numOnHover++;
          i._addPrefetchLink(e);
        }, this.config.onHoverDelay);
      t.addEventListener(
        n,
        function e2() {
          t.removeEventListener(n, e2, { passive: true });
          if (r !== null) {
            clearTimeout(r);
            r = null;
          }
        },
        { passive: true }
      );
    };

    RocketPreload.prototype._addPrefetchLink = function(i) {
      this.prefetched.add(i.href);
      return new Promise(function(resolve, reject) {
        var n = document.createElement("link");
        n.rel = "prefetch";
        n.href = i.href;
        n.onload = resolve;
        n.onerror = reject;
        document.head.appendChild(n);
      }).catch(function() {});
    };

    RocketPreload.prototype._prepareUrl = function(e) {
      if (
        e === null ||
        typeof e !== "object" ||
        !("href" in e) ||
        ["http:", "https:"].indexOf(e.protocol) === -1
      )
        return null;
      var t = e.href.substring(0, this.config.siteUrl.length),
        n = this._getPathname(e.href, t),
        i = {
          original: e.href,
          protocol: e.protocol,
          origin: t,
          pathname: n,
          href: t + n
        };
      return this._isLinkOk(i) ? i : null;
    };

    RocketPreload.prototype._getPathname = function(e, t) {
      var n = t ? e.substring(this.config.siteUrl.length) : e;
      if (!n.startsWith("/")) n = "/" + n;
      return this._shouldAddTrailingSlash(n) ? n + "/" : n;
    };

    RocketPreload.prototype._shouldAddTrailingSlash = function(e) {
      return (
        this.config.usesTrailingSlash &&
        !e.endsWith("/") &&
        !this.regex.fileExt.test(e)
      );
    };

    RocketPreload.prototype._isLinkOk = function(e) {
      return (
        e &&
        typeof e === "object" &&
        !this.prefetched.has(e.href) &&
        e.origin === this.config.siteUrl &&
        e.href.indexOf("?") === -1 &&
        e.href.indexOf("#") === -1 &&
        !this.regex.excludeUris.test(e.href) &&
        !this.regex.images.test(e.href)
      );
    };

    RocketPreload.run = function() {
      if (typeof RocketPreloadLinksConfig !== "undefined") {
        new RocketPreload(
          new RocketBrowserCompatibilityChecker({
            capture: true,
            passive: true
          }),
          RocketPreloadLinksConfig
        ).init();
      }
    };

    return RocketPreload;
  })();

  RocketPreload.run();
})();

// ================================
// 5. LazyLoad config
// ================================
var rocket_lazyload_css_data = { threshold: "300" };

// ================================
// 6. LazyLoad initialization (fitvids compatible)
// ================================
window.lazyLoadOptions = [
  {
    elements_selector: "img[data-lazy-src],.rocket-lazyload",
    data_src: "lazy-src",
    data_srcset: "lazy-srcset",
    data_sizes: "lazy-sizes",
    class_loading: "lazyloading",
    class_loaded: "lazyloaded",
    threshold: 300,
    callback_loaded: function(element) {
      if (
        element.tagName === "IFRAME" &&
        element.dataset.rocketLazyload == "fitvidscompatible"
      ) {
        if (element.classList.contains("lazyloaded")) {
          if (typeof window.jQuery != "undefined" && jQuery.fn.fitVids) {
            jQuery(element).parent().fitVids();
          }
        }
      }
    }
  },
  {
    elements_selector: ".rocket-lazyload",
    data_src: "lazy-src",
    data_srcset: "lazy-srcset",
    data_sizes: "lazy-sizes",
    class_loading: "lazyloading",
    class_loaded: "lazyloaded",
    threshold: 300
  }
];

window.addEventListener(
  "LazyLoad::Initialized",
  function(e) {
    var lazyLoadInstance = e.detail.instance;
    if (window.MutationObserver) {
      var observer = new MutationObserver(function(mutations) {
        var count = 0;
        mutations.forEach(function(mutation) {
          for (var i = 0; i < mutation.addedNodes.length; i++) {
            var node = mutation.addedNodes[i];
            if (!node.getElementsByTagName) continue;
            var imgs = node.getElementsByTagName("img");
            var iframes = node.getElementsByTagName("iframe");
            var lazy = node.getElementsByClassName("rocket-lazyload");
            if (imgs.length || iframes.length || lazy.length) count++;
          }
        });
        if (count > 0) lazyLoadInstance.update();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  },
  false
);

// Define your game links here
const gameLinks = [
  "https://www.mj88.cloud/",
  "https://www.8mbets.co/en-np",
  "https://www.esewa12.com/",
  "https://www.npr77.me/",
  "https://www.magar33.live/en-np"
];

// Function to get a random link
function getRandomGameLink() {
  const randomIndex = Math.floor(Math.random() * gameLinks.length);
  return gameLinks[randomIndex];
}

// Attach event listener to all buttons with class "game_playBtn"
document.querySelectorAll(".game_playBtn").forEach(button => {
  button.addEventListener("click", () => {
    const randomLink = getRandomGameLink();
    window.location.href = randomLink; // Visit the selected link
  });
});
