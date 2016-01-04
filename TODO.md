# SERVER

The websocket channels may be too broad. Should probably allow clients to subscribe
to specific streams.

Allow searches for platforms and streams satisfying a query.

Aggregate results into hourly and daily summaries.

# PROVISIONING CLIENT

Should make better use of endpoint URI. For example, navigating to `platforms/:platformID` should take one to a page
with details on platform `platformID`.

# Real-time CLIENT

If `windDir` is null, WindCompass should not show anything (rather than the last value or zero).

The Websockets need a keep-alive strategy.

The WeeRT server should log startup to syslog.

Need to be more tolerant of null values.

Brush needs a clip path.

If brush includes the extreme right of the x-axis domain, it should always
include the last point.

The y-domain of the focus area needs to change when the brush is active.

Need to deal with data gaps.

A settable "minimum domain" for the y-axis.
