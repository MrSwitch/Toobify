﻿#!/usr/bin/env python
"""Demonstrates OAuth WRAP authorization on Windows Live
For more information on OAuth WRAP, see http://wiki.oauth.net/OAuth-WRAP.
"""

import re
import Cookie
import datetime
import email.utils
import logging
import time
import os
import cgi
import wsgiref.handlers
import urllib

from google.appengine.api import urlfetch
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util

# LIVE API TOKEN
LIVE_API_TOKEN = {
	"toobify.appspot.com": {
	    "key":"000000004403EA3B",
	    "secret":"6olfTB4Ku8eDkEceqhnCxsCN1lfxq18G"
	},
	"toobify.com": {
	    "key":"0000000044039A0A",
	    "secret":"hZgY7BSxrbYDBvrqAoKcAwokjpUudiUy"
	},
	"sandbox.knarly.local": {
		"key":"000000004403AD10",
		"secret":"gvApbehUKXygLsZRIPyitjdrlrqo7ksJ"
	}
}[re.sub(r":.*", r"", os.environ.get('HTTP_HOST'))]

class MainHandler(webapp.RequestHandler):
	def get(self):
		"""Callback for the OAuth WRAP authorization handler."""
		code = self.request.get("wrap_verification_code")
		
		if not code:
			self.response.out.write("There is no wrap_vertification_token");
			return 1
		
		callback = self.request.get("callback")

		if callback:
			callback = '?callback=' + callback

		try:
			# BUILD DATA STRING
			data = urllib.urlencode(dict(
				wrap_client_id=LIVE_API_TOKEN["key"],
				wrap_client_secret=LIVE_API_TOKEN["secret"],
				wrap_callback=self.request.host_url + self.request.path + callback,
				wrap_verification_code=code
			))

			# GET ACCESS TOKEN
			resp = urlfetch.fetch(url="https://consent.live.com/AccessToken.aspx",
					payload=data,
					method="POST");

			# Raise error if we dont get a good response from the server
			if resp.status_code != 200:
				raise

			response = cgi.parse_qs(resp.content)
			access_token = response["wrap_access_token"][0]

			# SET COOKIES
			cookies = dict(
			    accessToken	=access_token,
			    c_accessToken=access_token,
				c_expiry	= response["wrap_access_token_expires_in"][0], 
				c_uid		= response["uid"][0],
				c_clientId	= LIVE_API_TOKEN["key"],
				c_clientState = self.request.get("wrap_client_state"),
				c_scope	= self.request.get("exp"),
				lca		= "done"
			)
			for name in cookies:
				cookie = Cookie.BaseCookie()
				cookie[name] = cookies[name]
				cookie[name]["path"] = "/"
				cookie[name]["expires"] = email.utils.formatdate( time.time() + 30 * 86400, localtime=False, usegmt=True )
				self.response.headers._headers.append(("Set-Cookie", cookie.output()[12:]))
		
			# ATTACH CALLBACK
			callback = self.request.get("callback")
			if callback:
				callback = "window.opener." + callback +"(\""+access_token+"\","+cookies["c_expiry"]+");"

			# PRINT OUT HTML
			self.response.out.write("<html><head><script>function callback(){" + callback + "self.close();}setTimeout(callback,500);</script></head><body onload='callback()'></body></html>");

		except:
			self.response.out.write("Authentication failed")

def main():
	app = webapp.WSGIApplication([('.*', MainHandler)], debug=True)
	util.run_wsgi_app(app)

if __name__ == '__main__':
	main()