from __future__ import annotations

import warnings


def suppress_known_runtime_noise() -> None:
    warnings.filterwarnings(
        "ignore", message="dropout option adds dropout after all but last recurrent layer.*", category=UserWarning
    )
    warnings.filterwarnings("ignore", message="`torch.nn.utils.weight_norm` is deprecated.*", category=FutureWarning)
