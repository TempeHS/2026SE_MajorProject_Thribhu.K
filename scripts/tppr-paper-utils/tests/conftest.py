import logging


class TPPRPackageLogFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        return record.name.startswith("tppr_paper_utils")


def pytest_configure(config):
    # logging support
    logging.getLogger("tppr_paper_utils").setLevel(logging.DEBUG)

    logging_plugin = config.pluginmanager.get_plugin("logging-plugin")
    if not logging_plugin:
        return

    package_filter = TPPRPackageLogFilter()
    logging_plugin.log_cli_handler.addFilter(package_filter)
