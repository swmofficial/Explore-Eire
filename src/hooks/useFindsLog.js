  const { queueWrite } = useOfflineQueue();

  const addFind = async (findData) => {
    const { data, error, offline } = await queueWrite('finds_log', 'insert', findData);
    if (data) {
      setFinds((prev) => [data, ...prev]);
    }
    return { data, error, offline };
  };