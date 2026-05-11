  const { queueWrite } = useOfflineQueue();

  const saveTrack = async (trackData) => {
    const { data, error, offline } = await queueWrite('tracks', 'insert', trackData);
    if (data) {
      setTracks((prev) => [data, ...prev]);
    }
    return { data, error, offline };
  };