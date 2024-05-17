from typing import Final

from rotkehlchen.chain.evm.decoding.types import CounterpartyDetails


CPT_HOP: Final = 'hop-protocol'
HOP_CPT_DETAILS: Final = CounterpartyDetails(
    identifier=CPT_HOP,
    label='Hop Protocol',
    image='hop_protocol.png',
)

TRANSFER_FROM_L1_COMPLETED: Final = b'2\tX\x17i0\x80N\xb6l#C\xc74?\xc06}\xc1bIY\x0c\x0f\x19W\x83\xbe\xe1\x99\xd0\x94'  # noqa: E501
WITHDRAWAL_BONDED: Final = b'\x0c=%\x0cx1\x05\x1ex\xaajVg\x9eY\x03t\xc7\xc4$A_\xfeJ\xa4tI\x1d\xef/\xe7\x05'  # noqa: E501
TRANSFER_SENT: Final = b'\xe3]\xdd\xd4\xeau\xd7\xe9\xb3\xfe\x93\xafON@\xe7x\xc3\xda@t\xc9\xd9>|e6\xf1\xe8\x03\xc1\xeb'  # noqa: E501
WITHDREW: Final = b'\x94u\xcd\xbd\xe5\xfcq\xfe,\xcdA<\x82\x87\x8e\xe5M\x06\x1b\x9ft\xf9\xe2\xe1\xa0?\xf1\x17\x88!P,'  # noqa: E501
TOKEN_SWAP: Final = b'\xc6\xc1\xe0c\r\xbe\x910\xcc\x06\x80(Hl\r\x11\x8d\xdc\xea4\x85P\x81\x9d\xef\xd5\xcb\x8c%\x7f\x8a8'  # noqa: E501