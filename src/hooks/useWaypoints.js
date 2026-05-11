  const { queueWrite } = useOfflineQueue();

  const addWaypoint = async (waypointData) => {
    const { data, error, offline } = await queueWrite('waypoints', 'insert', waypointData);
    if (data) {
      setWaypoints((prev) => [data, ...prev]);
    }
    return { data, error, offline };
  };