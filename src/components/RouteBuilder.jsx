  const { queueWrite } = useOfflineQueue();

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const routeData = {
      user_id: user.id,
      name: routeName,
      geometry: {
        type: 'LineString',
        coordinates: routePoints.map((p) => [p.lng, p.lat]),
      },
    };
    const { data, error, offline } = await queueWrite('routes', 'insert', routeData);
    if (data) {
      addToast({ 
        message: offline ? 'Route saved offline - will sync when connected' : 'Route saved', 
        type: offline ? 'warning' : 'success', 
        duration: 3000 
      });
      clearRoutePoints();
      setRouteBuilderOpen(false);
    } else if (error) {
      addToast({ message: 'Failed to save route', type: 'error', duration: 3000 });
    }
  };