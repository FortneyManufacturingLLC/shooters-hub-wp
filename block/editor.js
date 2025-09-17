(function(wp){
  if (!wp || !wp.blocks) return;
  const { registerBlockType } = wp.blocks;
  const { InspectorControls } = wp.blockEditor || wp.editor;
  const { PanelBody, TextControl, ToggleControl } = wp.components;
  const { __ } = wp.i18n || { __: (s) => s };
  const { createElement: el, Fragment } = wp.element;

  const textControl = (label, value, onChange) => el(TextControl, { label, value: value || '', onChange });
  const toggleControl = (label, value, onChange) => el(ToggleControl, { label, checked: !!value, onChange });
  const preview = (title, description) => el('div', { className: 'sh-block-preview' }, [
    el('strong', { key: 'title' }, title),
    el('p', { key: 'desc' }, description),
  ]);

  registerBlockType('shooters-hub/match-finder', {
    edit: ({ attributes, setAttributes }) => el(Fragment, null, [
      el(InspectorControls, { key: 'controls' }, [
        el(PanelBody, { title: __('Match Finder Settings', 'shooters-hub'), initialOpen: true }, [
          textControl(__('Default View (map,list,calendar)', 'shooters-hub'), attributes.view, (view) => setAttributes({ view })),
          textControl(__('Latitude', 'shooters-hub'), attributes.lat, (lat) => setAttributes({ lat })),
          textControl(__('Longitude', 'shooters-hub'), attributes.lng, (lng) => setAttributes({ lng })),
          textControl(__('Radius (miles)', 'shooters-hub'), attributes.radius, (radius) => setAttributes({ radius })),
          textControl(__('From Date', 'shooters-hub'), attributes.from, (from) => setAttributes({ from })),
          textControl(__('To Date', 'shooters-hub'), attributes.to, (to) => setAttributes({ to })),
          textControl(__('Types (CSV)', 'shooters-hub'), attributes.types, (types) => setAttributes({ types })),
          textControl(__('Tiers (CSV)', 'shooters-hub'), attributes.tiers, (tiers) => setAttributes({ tiers })),
          textControl(__('Statuses (CSV)', 'shooters-hub'), attributes.statuses, (statuses) => setAttributes({ statuses })),
          textControl(__('Seasons (CSV)', 'shooters-hub'), attributes.seasons, (seasons) => setAttributes({ seasons })),
          textControl(__('Series (CSV)', 'shooters-hub'), attributes.series, (series) => setAttributes({ series })),
          textControl(__('Allowed Views Override (CSV)', 'shooters-hub'), attributes.allowedViews, (allowedViews) => setAttributes({ allowedViews })),
          toggleControl(__('Lock view', 'shooters-hub'), attributes.lockView, (lockView) => setAttributes({ lockView })),
          toggleControl(__('Lock location', 'shooters-hub'), attributes.lockLocation, (lockLocation) => setAttributes({ lockLocation })),
          toggleControl(__('Lock radius', 'shooters-hub'), attributes.lockRadius, (lockRadius) => setAttributes({ lockRadius })),
          toggleControl(__('Lock filters', 'shooters-hub'), attributes.lockFilters, (lockFilters) => setAttributes({ lockFilters })),
          toggleControl(__('Hide “Powered by” badge', 'shooters-hub'), attributes.poweredBy === false, (hidden) => setAttributes({ poweredBy: hidden ? false : undefined })),
        ]),
      ]),
      preview(__('Shooters Hub Match Finder', 'shooters-hub'), __('Front-end preview renders on the published page.', 'shooters-hub')),
    ]),
    save: () => null,
  });

  registerBlockType('shooters-hub/match-card', {
    edit: ({ attributes, setAttributes }) => el(Fragment, null, [
      el(InspectorControls, { key: 'controls' }, [
        el(PanelBody, { title: __('Match Card Settings', 'shooters-hub'), initialOpen: true }, [
          textControl(__('Match ID', 'shooters-hub'), attributes.matchId, (matchId) => setAttributes({ matchId })),
          toggleControl(__('Show image', 'shooters-hub'), attributes.showImage !== false, (checked) => setAttributes({ showImage: checked })),
          toggleControl(__('Show description', 'shooters-hub'), !!attributes.showDescription, (showDescription) => setAttributes({ showDescription })),
          toggleControl(__('Show action button', 'shooters-hub'), attributes.showButton !== false, (showButton) => setAttributes({ showButton })),
          toggleControl(__('Show “Powered by” badge', 'shooters-hub'), attributes.poweredBy !== false, (poweredBy) => setAttributes({ poweredBy })),
        ]),
      ]),
      preview(__('Shooters Hub Match Card', 'shooters-hub'), __('Displays details for the selected match.', 'shooters-hub')),
    ]),
    save: () => null,
  });

  registerBlockType('shooters-hub/club-card', {
    edit: ({ attributes, setAttributes }) => el(Fragment, null, [
      el(InspectorControls, { key: 'controls' }, [
        el(PanelBody, { title: __('Club Card Settings', 'shooters-hub'), initialOpen: true }, [
          textControl(__('Club ID', 'shooters-hub'), attributes.clubId, (clubId) => setAttributes({ clubId })),
          toggleControl(__('Show description', 'shooters-hub'), attributes.showDescription !== false, (showDescription) => setAttributes({ showDescription })),
          toggleControl(__('Show contact information', 'shooters-hub'), attributes.showContact !== false, (showContact) => setAttributes({ showContact })),
          toggleControl(__('Show “Powered by” badge', 'shooters-hub'), attributes.poweredBy !== false, (poweredBy) => setAttributes({ poweredBy })),
        ]),
      ]),
      preview(__('Shooters Hub Club Card', 'shooters-hub'), __('Highlights a club from The Shooters Hub.', 'shooters-hub')),
    ]),
    save: () => null,
  });

  registerBlockType('shooters-hub/leaderboard', {
    edit: ({ attributes, setAttributes }) => el(Fragment, null, [
      el(InspectorControls, { key: 'controls' }, [
        el(PanelBody, { title: __('Leaderboard Settings', 'shooters-hub'), initialOpen: true }, [
          textControl(__('Season ID', 'shooters-hub'), attributes.seasonId, (seasonId) => setAttributes({ seasonId })),
          textControl(__('Custom title', 'shooters-hub'), attributes.title, (title) => setAttributes({ title })),
          textControl(__('Limit rows', 'shooters-hub'), attributes.limit, (limit) => setAttributes({ limit })),
          toggleControl(__('Show “Powered by” badge', 'shooters-hub'), attributes.poweredBy !== false, (poweredBy) => setAttributes({ poweredBy })),
        ]),
      ]),
      preview(__('Shooters Hub Leaderboard', 'shooters-hub'), __('Shows leaderboard entries for a season.', 'shooters-hub')),
    ]),
    save: () => null,
  });
})(window.wp);
